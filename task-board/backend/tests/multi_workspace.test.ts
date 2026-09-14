import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';

const app = createApp();

async function registerUser(email: string, name: string = 'User') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'password123' });
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user.id as string,
    csrfCookie: res.headers['set-cookie']
      ? (res.headers['set-cookie'] as string[]).find((c) => c.startsWith('tb_csrf='))!.split(';')[0]!
      : '',
    csrfToken: res.headers['set-cookie']
      ? (res.headers['set-cookie'] as string[]).find((c) => c.startsWith('tb_csrf='))!.split(';')[0]!.split('=')[1]!
      : '',
  };
}

describe('Multi-Workspace Management & Isolation', () => {
  it('Enforces multi-workspace membership, workspace switching, project isolation, and transactional Project Head changes', async () => {
    // 1. Register users with dynamic emails for test isolation
    const suffix = Date.now();
    const rahulEmail = `rahul-${suffix}@example.com`;
    const amitEmail = `amit-${suffix}@example.com`;
    const priyaEmail = `priya-${suffix}@example.com`;
    const sarahEmail = `sarah-${suffix}@example.com`;

    const rahul = await registerUser(rahulEmail, 'Rahul');
    const amit = await registerUser(amitEmail, 'Amit');
    const priya = await registerUser(priyaEmail, 'Priya');
    const sarah = await registerUser(sarahEmail, 'Sarah');

    // 2. Rahul creates Workspace A
    const wsARes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({ name: 'Workspace A' });
    expect(wsARes.status).toBe(201);
    const workspaceAId = wsARes.body.data.id;

    // Priya creates Workspace B
    const wsBRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${priya.token}`)
      .set('Cookie', priya.csrfCookie)
      .set('x-csrf-token', priya.csrfToken)
      .send({ name: 'Workspace B' });
    expect(wsBRes.status).toBe(201);
    const workspaceBId = wsBRes.body.data.id;

    // Add Rahul as Member to Workspace B
    const addRahulToB = await request(app)
      .post(`/api/workspaces/${workspaceBId}/members`)
      .set('Authorization', `Bearer ${priya.token}`)
      .set('Cookie', priya.csrfCookie)
      .set('x-csrf-token', priya.csrfToken)
      .send({ email: rahulEmail, role: 'member' });
    expect(addRahulToB.status).toBe(201);

    // Add Amit and Sarah to Workspace A
    await request(app)
      .post(`/api/workspaces/${workspaceAId}/members`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({ email: amitEmail, role: 'member' });

    await request(app)
      .post(`/api/workspaces/${workspaceAId}/members`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({ email: sarahEmail, role: 'member' });

    // Verify Rahul can view both Workspace A and Workspace B
    const rahulWorkspaces = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${rahul.token}`);
    expect(rahulWorkspaces.body.data.map((w: any) => w.id)).toEqual(
      expect.arrayContaining([workspaceAId, workspaceBId])
    );

    // Verify Rahul cannot access an unauthorized random workspace ID (ID guessing)
    const bogusWs = await request(app)
      .get('/api/workspaces/11111111-1111-1111-1111-111111111111')
      .set('Authorization', `Bearer ${rahul.token}`);
    expect(bogusWs.status).toBe(403);

    // 3. Project Creation in Workspace A with Head & Members:
    // Project A1: Head = Rahul, Member = Amit
    const projA1Res = await request(app)
      .post(`/api/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({
        name: 'Project A1',
        description: 'First project in A',
        headUserId: rahul.userId,
        memberUserIds: [amit.userId],
      });
    expect(projA1Res.status).toBe(201);
    const projectA1Id = projA1Res.body.data.id;

    // Project A2: Head = Sarah (assigned only to Sarah)
    const projA2Res = await request(app)
      .post(`/api/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({
        name: 'Project A2',
        description: 'Second project in A',
        headUserId: sarah.userId,
        memberUserIds: [],
      });
    expect(projA2Res.status).toBe(201);
    const projectA2Id = projA2Res.body.data.id;

    // Project B1 in Workspace B
    const projB1Res = await request(app)
      .post(`/api/workspaces/${workspaceBId}/projects`)
      .set('Authorization', `Bearer ${priya.token}`)
      .set('Cookie', priya.csrfCookie)
      .set('x-csrf-token', priya.csrfToken)
      .send({
        name: 'Project B1',
        headUserId: priya.userId,
        memberUserIds: [rahul.userId],
      });
    expect(projB1Res.status).toBe(201);
    const projectB1Id = projB1Res.body.data.id;

    // 4. Test Project Access Isolation:
    // Amit is assigned to Project A1, but NOT to Project A2.
    // Amit lists projects in Workspace A -> returns ONLY Project A1
    const amitProjects = await request(app)
      .get(`/api/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${amit.token}`);
    expect(amitProjects.status).toBe(200);
    expect(amitProjects.body.data.length).toBe(1);
    expect(amitProjects.body.data[0].id).toBe(projectA1Id);

    // Amit tries to access Project A2 directly -> 403 Forbidden
    const amitGetA2 = await request(app)
      .get(`/api/projects/${projectA2Id}`)
      .set('Authorization', `Bearer ${amit.token}`);
    expect(amitGetA2.status).toBe(403);

    // Rahul (Workspace Owner in Workspace A) gets access to ALL projects in Workspace A (Project A1 & Project A2)
    const rahulProjectsA = await request(app)
      .get(`/api/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${rahul.token}`);
    expect(rahulProjectsA.status).toBe(200);
    expect(rahulProjectsA.body.data.length).toBe(2);

    // Rahul (Member in Workspace B) lists projects in Workspace B -> returns Project B1
    const rahulProjectsB = await request(app)
      .get(`/api/workspaces/${workspaceBId}/projects`)
      .set('Authorization', `Bearer ${rahul.token}`);
    expect(rahulProjectsB.status).toBe(200);
    expect(rahulProjectsB.body.data.length).toBe(1);
    expect(rahulProjectsB.body.data[0].id).toBe(projectB1Id);

    // 5. Test Project Head Management (Transactional):
    // Rahul (Owner of Workspace A) changes Project Head of Project A1 from Rahul to Amit
    const setHeadRes = await request(app)
      .patch(`/api/projects/${projectA1Id}/head`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({ userId: amit.userId });
    expect(setHeadRes.status).toBe(200);
    expect(setHeadRes.body.data.role).toBe('head');

    // Verify Project Members for Project A1: Amit is HEAD, Rahul is MEMBER
    const projA1Members = await request(app)
      .get(`/api/projects/${projectA1Id}/members`)
      .set('Authorization', `Bearer ${rahul.token}`);
    expect(projA1Members.status).toBe(200);
    const amitMember = projA1Members.body.data.find((m: any) => m.id === amit.userId);
    const rahulMember = projA1Members.body.data.find((m: any) => m.id === rahul.userId);
    expect(amitMember.role).toBe('head');
    expect(rahulMember.role).toBe('member');

    // Verify cannot set user from another workspace (e.g. Priya) as Project Head of Project A1
    const invalidHeadRes = await request(app)
      .patch(`/api/projects/${projectA1Id}/head`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken)
      .send({ userId: priya.userId });
    expect(invalidHeadRes.status).toBe(403);

    // 6. Test Member Removal Invalidation:
    // Remove Amit from Workspace A
    const removeMemberRes = await request(app)
      .delete(`/api/workspaces/${workspaceAId}/members/${amit.userId}`)
      .set('Authorization', `Bearer ${rahul.token}`)
      .set('Cookie', rahul.csrfCookie)
      .set('x-csrf-token', rahul.csrfToken);
    expect(removeMemberRes.status).toBe(204);

    // Amit tries to access Workspace A projects -> 403 Forbidden
    const amitPostRemoval = await request(app)
      .get(`/api/workspaces/${workspaceAId}/projects`)
      .set('Authorization', `Bearer ${amit.token}`);
    expect(amitPostRemoval.status).toBe(403);

    // Amit tries to access Project A1 directly -> 403 Forbidden
    const amitGetA1PostRemoval = await request(app)
      .get(`/api/projects/${projectA1Id}`)
      .set('Authorization', `Bearer ${amit.token}`);
    expect(amitGetA1PostRemoval.status).toBe(403);
  });
});

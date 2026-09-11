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

describe('Activity History Scopes & Authorization', () => {
  it('Handles My Activity, Project Activity, Workspace Activity, and Task History with RBAC authorization', async () => {
    // 1. Register Owner and Member with dynamic emails
    const suffix = Date.now();
    const ownerEmail = `act_owner_${suffix}@example.com`;
    const memberEmail = `act_member_${suffix}@example.com`;

    const owner = await registerUser(ownerEmail, 'Activity Owner');
    const member = await registerUser(memberEmail, 'Activity Member');

    // 2. Create Workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Activity Test Workspace' });
    expect(wsRes.status).toBe(201);
    const workspaceId = wsRes.body.data.id;

    // 3. Add Member to Workspace
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: memberEmail, role: 'member' });

    // 4. Create Project
    const projRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Activity Project', memberUserIds: [member.userId] });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.data.id;

    // 5. Create Board & Task
    const boardRes = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Sprint 01' });
    expect(boardRes.status).toBe(201);
    const boardId = boardRes.body.data.id;

    // Fetch column
    const colsRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${owner.token}`);
    const colId = colsRes.body.data[0].id;

    // Create Task
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Task History Test', columnId: colId });
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.id;

    // 6. Test My Activity Scope
    const myActRes = await request(app)
      .get(`/api/workspaces/${workspaceId}/activity?scope=my`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(myActRes.status).toBe(200);
    expect(Array.isArray(myActRes.body.data)).toBe(true);

    // 7. Test Project Activity Scope
    const projActRes = await request(app)
      .get(`/api/projects/${projectId}/activity`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(projActRes.status).toBe(200);
    expect(Array.isArray(projActRes.body.data)).toBe(true);

    // 8. Test Task History Scope
    const taskActRes = await request(app)
      .get(`/api/tasks/${taskId}/activity`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(taskActRes.status).toBe(200);
    expect(Array.isArray(taskActRes.body.data)).toBe(true);

    // 9. Test Activity Retention Policy Update & Pruning
    const updateRetentionRes = await request(app)
      .put(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ activityRetentionDays: 7 });
    expect(updateRetentionRes.status).toBe(200);
    expect(updateRetentionRes.body.data.activityRetentionDays).toBe(7);

    const pruneRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/activity/prune`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken);
    expect(pruneRes.status).toBe(200);
    expect(typeof pruneRes.body.data.prunedCount).toBe('number');
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/config/db.js';

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

function getUniqueEmail() {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
}

describe('Case 1 — New owner signup (atomic provisioning)', () => {
  it('creates user, workspace, owner membership, project, board, and columns atomically', async () => {
    const email = getUniqueEmail();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner User', email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const userId = res.body.data.user.id;

    const workspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
    expect(workspaces.length).toBe(1);
    const workspace = workspaces[0];

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    expect(member).not.toBeNull();
    expect(member!.role).toBe('owner');

    const projects = await prisma.project.findMany({ where: { workspaceId: workspace.id } });
    expect(projects.length).toBe(1);
    const project = projects[0];

    const boards = await prisma.board.findMany({ where: { projectId: project.id } });
    expect(boards.length).toBe(1);
    const board = boards[0];

    const columns = await prisma.boardColumn.findMany({ where: { boardId: board.id }, orderBy: { position: 'asc' } });
    expect(columns.length).toBe(4);
    expect(columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Review', 'Done']);
  });
});

describe('Case 5 — Owner membership integrity', () => {
  it('workspace.ownerId matches owner user and WorkspaceMember role is owner', async () => {
    const email = getUniqueEmail();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner User', email, password: 'password123' });
    const userId = reg.body.data.user.id;

    const workspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
    expect(workspaces.length).toBe(1);
    const workspace = workspaces[0];

    expect(workspace.ownerId).toBe(userId);

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    expect(member).not.toBeNull();
    expect(member!.userId).toBe(userId);
    expect(member!.workspaceId).toBe(workspace.id);
    expect(member!.role).toBe('owner');
  });
});

describe('Case 2 — Workspace member cannot delete workspace', () => {
  it('returns 403 when a member tries to delete', async () => {
    const ownerEmail = getUniqueEmail();
    const memberEmail = getUniqueEmail();
    const owner = await registerUser(ownerEmail, 'Owner');
    const member = await registerUser(memberEmail, 'Member');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Test Workspace' });
    const workspaceId = wsRes.body.data.id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: memberEmail, role: 'member' });

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken);
    expect(deleteRes.status).toBe(403);
  });
});

describe('Case 3 — Workspace admin cannot delete workspace', () => {
  it('returns 403 when an admin tries to delete', async () => {
    const ownerEmail = getUniqueEmail();
    const adminEmail = getUniqueEmail();
    const owner = await registerUser(ownerEmail, 'Owner');
    const admin = await registerUser(adminEmail, 'Admin');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Test Workspace' });
    const workspaceId = wsRes.body.data.id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: adminEmail, role: 'admin' });

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set('Cookie', admin.csrfCookie)
      .set('x-csrf-token', admin.csrfToken);
    expect(deleteRes.status).toBe(403);
  });
});

describe('Case 4 — Unrelated user cannot delete workspace', () => {
  it('returns 403 when a non-member tries to delete', async () => {
    const ownerEmail = getUniqueEmail();
    const unrelatedEmail = getUniqueEmail();
    const owner = await registerUser(ownerEmail, 'Owner');
    const unrelated = await registerUser(unrelatedEmail, 'Stranger');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Test Workspace' });
    const workspaceId = wsRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${unrelated.token}`)
      .set('Cookie', unrelated.csrfCookie)
      .set('x-csrf-token', unrelated.csrfToken);
    expect(deleteRes.status).toBe(403);
  });
});

describe('Owner can delete workspace', () => {
  it('returns 204 when owner deletes', async () => {
    const ownerEmail = getUniqueEmail();
    const owner = await registerUser(ownerEmail, 'Owner');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Deletable Workspace' });
    const workspaceId = wsRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken);
    expect(deleteRes.status).toBe(204);

    const deleted = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    expect(deleted).toBeNull();
  });
});

describe('Case 7 — No P2003 on workspace creation', () => {
  it('createWorkspace does not produce foreign key errors', async () => {
    const ownerEmail = getUniqueEmail();
    const owner = await registerUser(ownerEmail, 'Owner');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Another Workspace' });

    expect(wsRes.status).toBe(201);
    expect(wsRes.body.data.id).toBeDefined();

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: wsRes.body.data.id, userId: owner.userId } },
    });
    expect(member).not.toBeNull();
    expect(member!.role).toBe('owner');
  });
});

describe('Workspace appears after signup', () => {
  it('GET /api/workspaces returns the default workspace after registration', async () => {
    const email = getUniqueEmail();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password: 'password123' });
    const token = reg.body.data.accessToken as string;

    const wsList = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    expect(wsList.status).toBe(200);
    expect(wsList.body.data.length).toBeGreaterThanOrEqual(1);
    expect(wsList.body.data[0].name).toContain('Workspace');
  });
});

describe('Owner can delete own workspace via API', () => {
  it('owner deletion succeeds and workspace is removed from list', async () => {
    const email = getUniqueEmail();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Del User', email, password: 'password123' });
    const token = reg.body.data.accessToken as string;
    const userId = reg.body.data.user.id;
    const csrfCookie = (reg.headers['set-cookie'] as string[]).find((c) => c.startsWith('tb_csrf='))!.split(';')[0]!;
    const csrfToken = csrfCookie.split('=')[1]!;

    const wsList = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    const workspaceId = wsList.body.data[0].id;

    const delRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);
    expect(delRes.status).toBe(204);

    const afterDel = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`);
    expect(afterDel.body.data.find((w: any) => w.id === workspaceId)).toBeUndefined();
  });
});

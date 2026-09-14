import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/config/db.js';

const app = createApp();

async function registerUser(email: string, name: string = 'Security User') {
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

describe('Security Hardening & Access Control', () => {
  it('CORS origin checking validates trusted origins and rejects disallowed origins', async () => {
    // Trusted origin
    const okRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(okRes.status).toBe(200);

    // Disallowed origin is blocked by CORS
    const badRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://malicious-attacker-site.com');
    expect(badRes.status).toBe(500);
  });

  it('CSRF protection blocks mutating requests without valid CSRF double-submit token', async () => {
    const user = await registerUser(`csrf_${Date.now()}@example.com`);

    // Mutating request with NO CSRF header/cookie
    const failRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'CSRF Attack Workspace' });

    expect(failRes.status).toBe(403);
    expect(failRes.body.errorCode).toBe('CSRF_INVALID');

    // Mutating request with matching CSRF header + cookie
    const successRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .set('Cookie', user.csrfCookie)
      .set('x-csrf-token', user.csrfToken)
      .send({ name: 'CSRF Legitimate Workspace' });

    expect(successRes.status).toBe(201);
  });

  it('Enforces column and board consistency during task creation and move', async () => {
    const owner = await registerUser(`col_cons_${Date.now()}@example.com`);

    // Create workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Consistency Workspace' });
    const wsId = wsRes.body.data.id;

    // Create Project
    const projRes = await request(app)
      .post(`/api/workspaces/${wsId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Consistency Project' });
    const projId = projRes.body.data.id;

    // Create Board A with Column A1
    const boardARes = await request(app)
      .post(`/api/projects/${projId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Board A' });
    const boardAId = boardARes.body.data.id;

    const colARes = await request(app)
      .post(`/api/boards/${boardAId}/columns`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Column A1' });
    const colAId = colARes.body.data.id;

    // Create Board B with Column B1
    const boardBRes = await request(app)
      .post(`/api/projects/${projId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Board B' });
    const boardBId = boardBRes.body.data.id;

    const colBRes = await request(app)
      .post(`/api/boards/${boardBId}/columns`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Column B1' });
    const colBId = colBRes.body.data.id;

    // Attempt to create a task on Board A using Column B1 from Board B
    const crossBoardCreateRes = await request(app)
      .post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Cross Board Task', columnId: colBId });

    expect(crossBoardCreateRes.status).toBe(400);
    expect(crossBoardCreateRes.body.errorCode).toBe('INVALID_COLUMN');

    // Create valid task on Board A
    const validTaskRes = await request(app)
      .post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Valid Task', columnId: colAId });

    expect(validTaskRes.status).toBe(201);
    const taskId = validTaskRes.body.data.id;

    // Attempt to move task to Column B1 (different board)
    const crossBoardMoveRes = await request(app)
      .put(`/api/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ toColumnId: colBId, toPosition: 0, expectedVersion: 0 });

    expect(crossBoardMoveRes.status).toBe(400);
    expect(crossBoardMoveRes.body.errorCode).toBe('INVALID_COLUMN');
  });

  it('Checklist endpoints enforce project membership authorization', async () => {
    const owner = await registerUser(`chk_owner_${Date.now()}@example.com`);
    const intruder = await registerUser(`chk_intruder_${Date.now()}@example.com`);

    // Setup project, board, column, task
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Checklist Workspace' });
    const wsId = wsRes.body.data.id;

    const projRes = await request(app)
      .post(`/api/workspaces/${wsId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Checklist Project' });
    const projId = projRes.body.data.id;

    const boardRes = await request(app)
      .post(`/api/projects/${projId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Checklist Board' });
    const boardId = boardRes.body.data.id;

    const colRes = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Todo' });
    const colId = colRes.body.data.id;

    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Task with Checklists', columnId: colId });
    const taskId = taskRes.body.data.id;

    // Owner creates checklist item
    const chkRes = await request(app)
      .post(`/api/tasks/${taskId}/checklists`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Item 1' });
    expect(chkRes.status).toBe(201);
    const itemId = chkRes.body.data.id;

    // Intruder attempts to update checklist item
    const intruderPatchRes = await request(app)
      .patch(`/api/checklists/${itemId}`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .set('Cookie', intruder.csrfCookie)
      .set('x-csrf-token', intruder.csrfToken)
      .send({ completed: true });
    expect(intruderPatchRes.status).toBe(403);

    // Intruder attempts to delete checklist item
    const intruderDelRes = await request(app)
      .delete(`/api/checklists/${itemId}`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .set('Cookie', intruder.csrfCookie)
      .set('x-csrf-token', intruder.csrfToken);
    expect(intruderDelRes.status).toBe(403);
  });

  it('Completed task history endpoints require workspace authorization', async () => {
    const owner = await registerUser(`hist_owner_${Date.now()}@example.com`);
    const outsider = await registerUser(`hist_outsider_${Date.now()}@example.com`);

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'History Workspace' });
    const wsId = wsRes.body.data.id;

    // Outsider cannot access task history of another workspace
    const histGetRes = await request(app)
      .get(`/api/workspaces/${wsId}/tasks/history`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(histGetRes.status).toBe(403);

    // Outsider cannot prune completed tasks of another workspace
    const histPruneRes = await request(app)
      .post(`/api/workspaces/${wsId}/tasks/history/prune`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .set('Cookie', outsider.csrfCookie)
      .set('x-csrf-token', outsider.csrfToken)
      .send({ days: 30 });
    expect(histPruneRes.status).toBe(403);

    // Workspace owner CAN view task history
    const ownerHistGetRes = await request(app)
      .get(`/api/workspaces/${wsId}/tasks/history`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerHistGetRes.status).toBe(200);
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';

const app = createApp();

// Setup helper for registers
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

describe('Task, Comment, and Notification API Endpoints', () => {
  it('Handles Task CRUD, optimistic version locking, comments, and activities', async () => {
    // 1. Setup Users with dynamic emails
    const suffix = Date.now();
    const ownerEmail = `owner-p2-${suffix}@example.com`;
    const memberEmail = `member-p2-${suffix}@example.com`;

    const owner = await registerUser(ownerEmail, 'Owner User');
    const member = await registerUser(memberEmail, 'Member User');

    // 2. Owner creates a workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Forge Workspace' });
    const workspaceId = wsRes.body.data.id;

    // Add member
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: memberEmail, role: 'member' });

    // 3. Owner creates project
    const projRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Launch Pad', description: 'Operations', memberUserIds: [member.userId] });
    const projectId = projRes.body.data.id;

    // 4. Owner creates board
    const boardRes = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Board 1', description: 'Sprint Board' });
    const boardId = boardRes.body.data.id;

    // Get seeded columns (seeded automatically)
    const columnsRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${member.token}`);
    const todoColId = columnsRes.body.data[0].id;
    const inProgressColId = columnsRes.body.data[1].id;

    // 5. Create Task (as member)
    const createTaskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({
        title: 'Draft API spec',
        description: 'Detail endpoints',
        columnId: todoColId,
        priority: 'High',
        assigneeId: member.userId,
      });
    expect(createTaskRes.status).toBe(201);
    const task = createTaskRes.body.data;
    expect(task.title).toBe('Draft API spec');
    expect(task.version).toBe(0);

    // 6. Update Task with version checking
    // Successful update with correct expectedVersion
    const updateRes = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({
        title: 'Draft API spec v2',
        expectedVersion: 0,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Draft API spec v2');
    expect(updateRes.body.data.version).toBe(1);

    // Failed update due to version mismatch (concurrency block)
    const conflictUpdateRes = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({
        title: 'Conflict update',
        expectedVersion: 0, // Outdated version, should be 1
      });
    expect(conflictUpdateRes.status).toBe(409); // Version Conflict

    // 7. Move Task with version checking
    // Move task to IN PROGRESS column
    const moveRes = await request(app)
      .put(`/api/tasks/${task.id}/move`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({
        toColumnId: inProgressColId,
        toPosition: 0,
        expectedVersion: 1,
      });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.columnId).toBe(inProgressColId);
    expect(moveRes.body.data.version).toBe(2);

    // 8. Seeding a second task for reordering checks
    const createTask2 = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({
        title: 'Task 2',
        columnId: inProgressColId,
      });
    const task2 = createTask2.body.data;
    expect(task2.position).toBe(1); // Positioned second

    // 9. Comments
    const commentRes = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({ body: 'Looks complete!' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.body).toBe('Looks complete!');
    expect(commentRes.body.data.user.name).toBe('Member User');

    const getComments = await request(app)
      .get(`/api/tasks/${task.id}/comments`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(getComments.status).toBe(200);
    expect(getComments.body.data.length).toBe(1);

    // 10. Notifications
    // Since task is assigned to member, and owner modifies assignee or triggers updates, notifications are routed.
    // Let's verify notifications list:
    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${member.token}`);
    expect(notifs.status).toBe(200);

    // 11. Workspace Activity Logs
    const activities = await request(app)
      .get(`/api/workspaces/${workspaceId}/activity`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(activities.status).toBe(200);
    expect(activities.body.data.some((act: any) => act.action === 'commented')).toBe(true);
  }, 60000);
});

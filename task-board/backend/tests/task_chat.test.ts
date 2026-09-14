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

describe('Task Chat API Endpoints & Access Control', () => {
  it('Supports Task Chat message creation, cursor pagination, search, jump to date, edit, delete, and 403 authorization checks', async () => {
    const suffix = Date.now();
    const ownerEmail = `chat-owner-${suffix}@example.com`;
    const memberEmail = `chat-member-${suffix}@example.com`;
    const outsiderEmail = `chat-outsider-${suffix}@example.com`;

    const owner = await registerUser(ownerEmail, 'Chat Owner');
    const member = await registerUser(memberEmail, 'Chat Member');
    const outsider = await registerUser(outsiderEmail, 'Outsider User');

    // 1. Owner creates a workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Chat Test Workspace' });
    const workspaceId = wsRes.body.data.id;

    // Add member to workspace
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: memberEmail, role: 'member' });

    // 2. Owner creates project & board
    const projRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Chat Project', description: 'Testing task chat' });
    const projectId = projRes.body.data.id;

    const boardRes = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Chat Board' });
    const boardId = boardRes.body.data.id;

    const colsRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${owner.token}`);
    const columnId = colsRes.body.data[0].id;

    // 3. Owner creates a task
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ title: 'Build Chat Feature', columnId, priority: 'High' });
    const taskId = taskRes.body.data.id;

    // 4. Member sends chat message
    const msg1Res = await request(app)
      .post(`/api/tasks/${taskId}/chat/messages`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({ body: 'Hello @Chat Owner, I am working on the chat layout!' });

    expect(msg1Res.status).toBe(201);
    expect(msg1Res.body.data.body).toContain('working on the chat layout');
    const msg1Id = msg1Res.body.data.id;

    // 5. Owner sends chat message
    const msg2Res = await request(app)
      .post(`/api/tasks/${taskId}/chat/messages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ body: 'Awesome! Please ensure cursor pagination works.' });

    expect(msg2Res.status).toBe(201);
    const msg2Id = msg2Res.body.data.id;

    // 6. Fetch task chat messages with pagination
    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/chat/messages?limit=10`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);

    // 7. Search task chat messages
    const searchRes = await request(app)
      .get(`/api/tasks/${taskId}/chat/messages/search?q=pagination`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].id).toBe(msg2Id);

    // 8. Fetch messages around date
    const aroundRes = await request(app)
      .get(`/api/tasks/${taskId}/chat/messages/around?timestamp=${encodeURIComponent(new Date().toISOString())}&limit=10`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(aroundRes.status).toBe(200);
    expect(aroundRes.body.data.length).toBeGreaterThanOrEqual(1);

    // 9. Edit own chat message
    const editRes = await request(app)
      .put(`/api/chat/messages/${msg1Id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({ body: 'Updated chat message body' });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.isEdited).toBe(true);
    expect(editRes.body.data.body).toBe('Updated chat message body');

    // 10. Delete own chat message
    const delRes = await request(app)
      .delete(`/api/chat/messages/${msg1Id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.isDeleted).toBe(true);

    // 11. Unauthorized outsider tries to access task chat (403 FORBIDDEN)
    const forbiddenGet = await request(app)
      .get(`/api/tasks/${taskId}/chat/messages`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(forbiddenGet.status).toBe(403);

    const forbiddenPost = await request(app)
      .post(`/api/tasks/${taskId}/chat/messages`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .set('Cookie', outsider.csrfCookie)
      .set('x-csrf-token', outsider.csrfToken)
      .send({ body: 'Unauthorized message' });
    expect(forbiddenPost.status).toBe(403);
  }, 60000);
});


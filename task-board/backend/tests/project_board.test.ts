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

describe('Project and Board API Endpoints', () => {
  it('Handles project and board creation with workspace role checks', async () => {
    // 1. Register Owner, Admin, and Member
    const owner = await registerUser('owner@example.com', 'Owner User');
    const admin = await registerUser('admin@example.com', 'Admin User');
    const member = await registerUser('member@example.com', 'Member User');

    // 2. Owner creates a workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Northstar Studio' });

    expect(wsRes.status).toBe(201);
    const workspaceId = wsRes.body.data.id;
    expect(workspaceId).toBeTypeOf('string');

    // 3. Add Admin to workspace
    const addAdminRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: 'admin@example.com', role: 'admin' });
    expect(addAdminRes.status).toBe(201);

    // 4. Add Member to workspace
    const addMemberRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ email: 'member@example.com', role: 'member' });
    expect(addMemberRes.status).toBe(201);

    // 5. Test Project Creation Roles:
    // Only workspace 'owner' should be able to create projects.
    // Member tries to create project -> 403 Forbidden
    const createProjectMember = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({ name: 'Member Project', description: 'A project' });
    expect(createProjectMember.status).toBe(403);

    // Admin tries to create project -> 403 Forbidden (based on literal owner only rule)
    const createProjectAdmin = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set('Cookie', admin.csrfCookie)
      .set('x-csrf-token', admin.csrfToken)
      .send({ name: 'Admin Project', description: 'A project' });
    expect(createProjectAdmin.status).toBe(403);

    // Owner creates project -> 201 Created
    const createProjectOwner = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Cookie', owner.csrfCookie)
      .set('x-csrf-token', owner.csrfToken)
      .send({ name: 'Launch Control', description: 'Rocket launcher' });
    expect(createProjectOwner.status).toBe(201);
    const projectId = createProjectOwner.body.data.id;
    expect(projectId).toBeTypeOf('string');

    // 6. Test Project Get/List:
    // List projects as Member
    const listProjectsRes = await request(app)
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(listProjectsRes.status).toBe(200);
    expect(listProjectsRes.body.data.length).toBe(1);
    expect(listProjectsRes.body.data[0].name).toBe('Launch Control');

    // Get specific project as Member
    const getProjectRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(getProjectRes.status).toBe(200);
    expect(getProjectRes.body.data.name).toBe('Launch Control');

    // 7. Test Board Creation Roles:
    // Admin can manage boards. Member cannot.
    // Member tries to create board -> 403 Forbidden
    const createBoardMember = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${member.token}`)
      .set('Cookie', member.csrfCookie)
      .set('x-csrf-token', member.csrfToken)
      .send({ name: 'Sprint 04', description: 'Current active sprint' });
    expect(createBoardMember.status).toBe(403);

    // Admin creates board -> 201 Created
    const createBoardAdmin = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set('Cookie', admin.csrfCookie)
      .set('x-csrf-token', admin.csrfToken)
      .send({ name: 'Sprint 04', description: 'Current active sprint' });
    expect(createBoardAdmin.status).toBe(201);
    const boardId = createBoardAdmin.body.data.id;
    expect(boardId).toBeTypeOf('string');

    // 8. Test Board Column Creation / Defaults:
    // Creating a board automatically seeds default columns: TODO, IN PROGRESS, REVIEW, DONE
    const getColumnsRes = await request(app)
      .get(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(getColumnsRes.status).toBe(200);
    expect(getColumnsRes.body.data.length).toBe(4);
    expect(getColumnsRes.body.data.map((c: any) => c.name)).toEqual([
      'TODO',
      'IN PROGRESS',
      'REVIEW',
      'DONE',
    ]);

    const todoColId = getColumnsRes.body.data[0].id;
    const inProgressColId = getColumnsRes.body.data[1].id;

    // 9. Reorder Columns (Admin only)
    const reorderRes = await request(app)
      .put(`/api/boards/${boardId}/columns/reorder`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set('Cookie', admin.csrfCookie)
      .set('x-csrf-token', admin.csrfToken)
      .send({ orderedIds: [inProgressColId, todoColId] }); // Swap position of TODO and IN PROGRESS
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.data[0].name).toBe('IN PROGRESS');
    expect(reorderRes.body.data[1].name).toBe('TODO');

    // 10. Delete board (Admin/Owner only)
    const deleteBoardRes = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(deleteBoardRes.status).toBe(204);

    // Get boards should now return empty
    const listBoardsRes = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(listBoardsRes.status).toBe(200);
    expect(listBoardsRes.body.data.length).toBe(0);
  });
});

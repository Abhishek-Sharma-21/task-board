import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app.ts';
import { initSocket } from '../src/sockets/socket.ts';

let httpServer: HttpServer;
let serverPort: number;

async function registerUser(email: string, name: string) {
  const res = await request(httpServer)
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

beforeAll(() => {
  const app = createApp();
  httpServer = createServer(app);
  initSocket(httpServer);

  return new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        serverPort = address.port;
      }
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

describe('Socket.IO Real-Time Collaboration Integration', () => {
  it('Synchronizes board presence list and typing triggers between two clients', async () => {
    // 1. Setup two users
    const userA = await registerUser('usera@example.com', 'User A');
    const userB = await registerUser('userb@example.com', 'User B');

    // 2. Create board workspace, project and board
    const wsRes = await request(httpServer)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${userA.token}`)
      .set('Cookie', userA.csrfCookie)
      .set('x-csrf-token', userA.csrfToken)
      .send({ name: 'Realtime Space' });
    const workspaceId = wsRes.body.data.id;

    // Add user B to workspace
    await request(httpServer)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${userA.token}`)
      .set('Cookie', userA.csrfCookie)
      .set('x-csrf-token', userA.csrfToken)
      .send({ email: 'userb@example.com', role: 'member' });

    // Create project
    const projRes = await request(httpServer)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${userA.token}`)
      .set('Cookie', userA.csrfCookie)
      .set('x-csrf-token', userA.csrfToken)
      .send({ name: 'Project X' });
    const projectId = projRes.body.data.id;

    // Create board
    const boardRes = await request(httpServer)
      .post(`/api/projects/${projectId}/boards`)
      .set('Authorization', `Bearer ${userA.token}`)
      .set('Cookie', userA.csrfCookie)
      .set('x-csrf-token', userA.csrfToken)
      .send({ name: 'Board 1' });
    const boardId = boardRes.body.data.id;

    // 3. Connect User A Socket Client
    const socketA = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: userA.token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socketA.on('connect', resolve);
      socketA.on('connect_error', reject);
    });

    // 4. Connect User B Socket Client
    const socketB = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: userB.token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socketB.on('connect', resolve);
      socketB.on('connect_error', reject);
    });

    // 5. Join Board Room
    socketA.emit('joinBoard', { boardId, name: 'User A' });

    // Wait for A to join
    await new Promise<void>((resolve) => {
      socketA.once('board:presence', (activeUsers) => {
        expect(activeUsers.length).toBe(1);
        expect(activeUsers[0].name).toBe('User A');
        resolve();
      });
    });

    // B joins board room
    socketB.emit('joinBoard', { boardId, name: 'User B' });

    // A should receive board:presence with both users, and member:joined event for B
    await Promise.all([
      new Promise<void>((resolve) => {
        socketA.once('member:joined', (payload) => {
          expect(payload.userId).toBe(userB.userId);
          expect(payload.name).toBe('User B');
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        socketA.once('board:presence', (activeUsers) => {
          expect(activeUsers.length).toBe(2);
          resolve();
        });
      }),
    ]);

    // 6. Test Typing Indicator
    // B starts typing on taskId '123'
    socketB.emit('typing', { boardId, taskId: 'task-123', name: 'User B' });

    await new Promise<void>((resolve) => {
      socketA.once('userTyping', (payload) => {
        expect(payload.taskId).toBe('task-123');
        expect(payload.userId).toBe(userB.userId);
        expect(payload.name).toBe('User B');
        resolve();
      });
    });

    // B stops typing
    socketB.emit('stopTyping', { boardId, taskId: 'task-123' });

    await new Promise<void>((resolve) => {
      socketA.once('userStoppedTyping', (payload) => {
        expect(payload.taskId).toBe('task-123');
        expect(payload.userId).toBe(userB.userId);
        resolve();
      });
    });

    // Clean up connections
    socketA.close();
    socketB.close();
  });
});

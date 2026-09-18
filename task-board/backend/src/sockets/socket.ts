import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

let ioInstance: Server | null = null;

// Track active users per board: map of boardId -> map of userId -> socket info
const boardPresence = new Map<string, Map<string, { socketId: string; name: string }>>();

// Track users viewing specific tasks: map of taskId -> map of userId -> { name, socketId }
const taskPresence = new Map<string, Map<string, { socketId: string; name: string }>>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
    console.log(`[socket] User connected: ${userId} (socket ID: ${socket.id})`);

    // Handle joining a board room
    socket.on('joinBoard', async ({ boardId, name }: { boardId: string; name: string }) => {
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (!board) return;

      const wsMember = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspace: { projects: { some: { id: board.projectId } } },
        },
      });
      if (!wsMember) return;

      const isWsAdmin = wsMember.role.toLowerCase() === 'owner' || wsMember.role.toLowerCase() === 'admin';
      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId } },
      });

      // User must be a project member or workspace owner/admin
      if (!projectMember && !isWsAdmin) {
        return;
      }

      socket.join(`board:${boardId}`);
      console.log(`[socket] User ${userId} (${name}) joined room board:${boardId}`);

      // Update presence
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId)!.set(userId, { socketId: socket.id, name });

      // Broadcast updated presence list
      const activeUsers = Array.from(boardPresence.get(boardId)!.entries()).map(([uid, uinfo]) => ({
        id: uid,
        name: uinfo.name,
      }));
      io.to(`board:${boardId}`).emit('board:presence', activeUsers);

      // Emit member:joined
      socket.to(`board:${boardId}`).emit('member:joined', { userId, name });
    });

    // Handle leaving a board room
    socket.on('leaveBoard', ({ boardId }: { boardId: string }) => {
      socket.leave(`board:${boardId}`);
      console.log(`[socket] User ${userId} left room board:${boardId}`);

      // Update presence
      if (boardPresence.has(boardId)) {
        const pMap = boardPresence.get(boardId)!;
        pMap.delete(userId);
        if (pMap.size === 0) {
          boardPresence.delete(boardId);
        } else {
          // Broadcast updated presence list
          const activeUsers = Array.from(pMap.entries()).map(([uid, uinfo]) => ({
            id: uid,
            name: uinfo.name,
          }));
          io.to(`board:${boardId}`).emit('board:presence', activeUsers);
        }
      }

      socket.to(`board:${boardId}`).emit('member:left', { userId });
    });

    // Handle typing / editing presence
    socket.on('typing', ({ boardId, taskId, name }: { boardId: string; taskId: string; name: string }) => {
      socket.to(`board:${boardId}`).emit('userTyping', { taskId, userId, name });
    });

    socket.on('stopTyping', ({ boardId, taskId }: { boardId: string; taskId: string }) => {
      socket.to(`board:${boardId}`).emit('userStoppedTyping', { taskId, userId });
    });

    // Handle task drawer open/close (task presence)
    socket.on('joinTask', ({ taskId, boardId, name }: { taskId: string; boardId: string; name: string }) => {
      if (!taskPresence.has(taskId)) {
        taskPresence.set(taskId, new Map());
      }
      taskPresence.get(taskId)!.set(userId, { socketId: socket.id, name });

      const viewers = Array.from(taskPresence.get(taskId)!.entries())
        .filter(([uid]) => uid !== userId)
        .map(([uid, info]) => ({ id: uid, name: info.name }));
      socket.to(`board:${boardId}`).emit('task:presence', { taskId, viewers });
    });

    socket.on('leaveTask', ({ taskId, boardId }: { taskId: string; boardId: string }) => {
      if (taskPresence.has(taskId)) {
        const tMap = taskPresence.get(taskId)!;
        tMap.delete(userId);
        if (tMap.size === 0) taskPresence.delete(taskId);
      }
      const viewers = taskPresence.has(taskId)
        ? Array.from(taskPresence.get(taskId)!.entries())
            .filter(([uid]) => uid !== userId)
            .map(([uid, info]) => ({ id: uid, name: info.name }))
        : [];
      socket.to(`board:${boardId}`).emit('task:presence', { taskId, viewers });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] User disconnected: ${userId} (socket ID: ${socket.id})`);

      // Clean up task presence
      for (const [taskId, tMap] of taskPresence.entries()) {
        if (tMap.has(userId) && tMap.get(userId)!.socketId === socket.id) {
          tMap.delete(userId);
          if (tMap.size === 0) taskPresence.delete(taskId);
        }
      }

      // Clean up user from all board presences
      for (const [boardId, pMap] of boardPresence.entries()) {
        if (pMap.has(userId) && pMap.get(userId)!.socketId === socket.id) {
          pMap.delete(userId);
          const activeUsers = Array.from(pMap.entries()).map(([uid, uinfo]) => ({
            id: uid,
            name: uinfo.name,
          }));
          io.to(`board:${boardId}`).emit('board:presence', activeUsers);
          socket.to(`board:${boardId}`).emit('member:left', { userId });

          if (pMap.size === 0) {
            boardPresence.delete(boardId);
          }
        }
      }
    });
  });
}

export function initSocket(httpServer: any): Server {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
    ...env.corsOrigin,
  ];

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.nodeEnv === 'development') return callback(null, true);
        if (allowedOrigins.some((allowed) => origin === allowed)) {
          return callback(null, true);
        }
        return callback(new Error('CORS: Origin not allowed'));
      },
      credentials: true,
    },
  });

  // Socket middleware for JWT verification
  ioInstance.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }
    const tokenStr = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    try {
      const payload = verifyAccessToken(tokenStr);
      if (!payload?.sub) {
        return next(new Error('Authentication error: Invalid payload'));
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true },
      });
      if (!user) {
        return next(new Error('Authentication error: User no longer exists'));
      }
      socket.data.userId = user.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  setupSocketHandlers(ioInstance);
  return ioInstance;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
}

export function broadcast(room: string, event: string, data?: any): void {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
}

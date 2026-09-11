import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

let ioInstance: Server | null = null;

// Track active users per board: map of boardId -> map of userId -> socket info
const boardPresence = new Map<string, Map<string, { socketId: string; name: string }>>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
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

      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId } },
      });
      if (!projectMember && wsMember.role !== 'owner' && wsMember.role !== 'admin') return;

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

    socket.on('disconnect', () => {
      console.log(`[socket] User disconnected: ${userId} (socket ID: ${socket.id})`);

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
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  // Socket middleware for JWT verification
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }
    const tokenStr = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    try {
      const payload = verifyAccessToken(tokenStr);
      socket.data.userId = payload.sub;
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

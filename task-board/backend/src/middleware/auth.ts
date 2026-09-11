import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Empty access token'));
  }
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired access token'));
  }
}

const ROLE_LEVELS = {
  owner: 3,
  admin: 2,
  member: 1,
};

type RoleName = 'owner' | 'admin' | 'member';

export function requireWorkspaceRole(minRole: RoleName, workspaceIdParamName: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId || !isValidId(userId)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated'));
      }
      const workspaceId = req.params[workspaceIdParamName];
      if (!workspaceId || !isValidId(workspaceId)) {
        return next(new HttpError(400, 'BAD_REQUEST', `Missing or invalid parameter ${workspaceIdParamName}`));
      }

      const memberPromise = prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const member = await Promise.race([memberPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (!member) {
        return next(new HttpError(403, 'FORBIDDEN', 'You are not a member of this workspace'));
      }

      const userRole = (member.role || '').toLowerCase() as RoleName;
      const userLevel = ROLE_LEVELS[userRole] || 0;
      const minLevel = ROLE_LEVELS[minRole] || 0;
      if (userLevel < minLevel) {
        return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'));
      }

      return next();
    } catch (err: any) {
      if (err.message?.includes('Database query timeout')) {
        return next(new HttpError(504, 'GATEWAY_TIMEOUT', 'Database query timed out. Please try again.'));
      }
      return next(err);
    }
  };
}

export function requireProjectRole(minRole: RoleName, projectIdParamName: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId || !isValidId(userId)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated'));
      }
      const projectId = req.params[projectIdParamName];
      if (!projectId || !isValidId(projectId)) {
        return next(new HttpError(400, 'BAD_REQUEST', `Missing or invalid parameter ${projectIdParamName}`));
      }

      const projectPromise = prisma.project.findUnique({ where: { id: projectId } });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const project = await Promise.race([projectPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (!project) {
        return next(new HttpError(404, 'NOT_FOUND', 'Project not found'));
      }

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
      });

      if (wsMember && (wsMember.role.toLowerCase() === 'owner' || wsMember.role.toLowerCase() === 'admin')) {
        return next();
      }

      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!projectMember) {
        return next(new HttpError(403, 'FORBIDDEN', 'You are not a member of this project'));
      }

      if (minRole === 'admin') {
        if (projectMember.role !== 'head') {
          return next(new HttpError(403, 'FORBIDDEN', 'Insufficient project permissions'));
        }
      }

      return next();
    } catch (err: any) {
      if (err.message?.includes('Database query timeout')) {
        return next(new HttpError(504, 'GATEWAY_TIMEOUT', 'Database query timed out. Please try again.'));
      }
      return next(err);
    }
  };
}

export function requireBoardRole(minRole: RoleName, boardIdParamName: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId || !isValidId(userId)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated'));
      }
      const boardId = req.params[boardIdParamName];
      if (!boardId || !isValidId(boardId)) {
        return next(new HttpError(400, 'BAD_REQUEST', `Missing or invalid parameter ${boardIdParamName}`));
      }

      const boardPromise = prisma.board.findUnique({ where: { id: boardId } });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const board = await Promise.race([boardPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (!board) {
        return next(new HttpError(404, 'NOT_FOUND', 'Board not found'));
      }

      const project = await prisma.project.findUnique({ where: { id: board.projectId } });
      if (!project) {
        return next(new HttpError(404, 'NOT_FOUND', 'Project not found'));
      }

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
      });

      if (wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin')) {
        return next();
      }

      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId } },
      });
      if (!projectMember) {
        return next(new HttpError(403, 'FORBIDDEN', 'You are not a member of this project'));
      }

      if (minRole === 'admin') {
        if (projectMember.role !== 'head') {
          return next(new HttpError(403, 'FORBIDDEN', 'Insufficient project permissions'));
        }
      }

      return next();
    } catch (err: any) {
      if (err.message?.includes('Database query timeout')) {
        return next(new HttpError(504, 'GATEWAY_TIMEOUT', 'Database query timed out. Please try again.'));
      }
      return next(err);
    }
  };
}

export function requireTaskRole(minRole: RoleName, taskIdParamName: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId || !isValidId(userId)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated'));
      }
      const taskId = req.params[taskIdParamName];
      if (!taskId || !isValidId(taskId)) {
        return next(new HttpError(400, 'BAD_REQUEST', `Missing or invalid parameter ${taskIdParamName}`));
      }

      const taskPromise = prisma.task.findUnique({ where: { id: taskId } });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const task = await Promise.race([taskPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (!task) {
        return next(new HttpError(404, 'NOT_FOUND', 'Task not found'));
      }

      const project = await prisma.project.findUnique({ where: { id: task.projectId } });
      if (!project) {
        return next(new HttpError(404, 'NOT_FOUND', 'Project not found'));
      }

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
      });

      if (wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin')) {
        return next();
      }

      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });
      if (!projectMember) {
        return next(new HttpError(403, 'FORBIDDEN', 'You are not a member of this project'));
      }

      if (minRole === 'admin') {
        if (projectMember.role !== 'head') {
          return next(new HttpError(403, 'FORBIDDEN', 'Insufficient project permissions'));
        }
      }

      return next();
    } catch (err: any) {
      if (err.message?.includes('Database query timeout')) {
        return next(new HttpError(504, 'GATEWAY_TIMEOUT', 'Database query timed out. Please try again.'));
      }
      return next(err);
    }
  };
}

export function requireTaskAssignmentRole(taskIdParamName: string = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId || !isValidId(userId)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated'));
      }
      const taskId = req.params[taskIdParamName];
      if (!taskId || !isValidId(taskId)) {
        return next(new HttpError(400, 'BAD_REQUEST', `Missing or invalid parameter ${taskIdParamName}`));
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return next(new HttpError(404, 'NOT_FOUND', 'Task not found'));
      }

      const project = await prisma.project.findUnique({ where: { id: task.projectId } });
      if (!project) {
        return next(new HttpError(404, 'NOT_FOUND', 'Project not found'));
      }

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
      });

      if (wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin')) {
        return next();
      }

      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });
      if (!projectMember || projectMember.role !== 'head') {
        return next(new HttpError(403, 'FORBIDDEN', 'Only workspace admin or project head can assign tasks'));
      }

      return next();
    } catch (err: any) {
      if (err.message?.includes('Database query timeout')) {
        return next(new HttpError(504, 'GATEWAY_TIMEOUT', 'Database query timed out. Please try again.'));
      }
      return next(err);
    }
  };
}

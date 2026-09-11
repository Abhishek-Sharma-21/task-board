import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface CommentData {
  id: string;
  taskId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createComment(
  taskId: string,
  userId: string,
  body: string
): Promise<CommentData> {
  if (!isValidId(taskId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid task or user ID');
  }

  const comment = await prisma.comment.create({
    data: {
      taskId,
      userId,
      body,
    },
    include: {
      user: true,
    },
  });

  return formatComment(comment);
}

export async function getCommentsForTask(taskId: string): Promise<CommentData[]> {
  if (!isValidId(taskId)) {
    return [];
  }
  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: true,
    },
  });

  return comments.map(formatComment);
}

function formatComment(c: any): CommentData {
  return {
    id: c.id,
    taskId: c.taskId,
    user: {
      id: c.user.id,
      name: c.user.name,
      email: c.user.email,
    },
    body: c.body,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

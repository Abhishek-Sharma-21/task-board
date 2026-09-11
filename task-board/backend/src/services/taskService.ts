import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  projectId: string;
  boardId: string;
  columnId: string;
  position: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigneeId?: string;
  createdBy: string;
  labels: string[];
  dueDate?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTask(
  boardId: string,
  userId: string,
  payload: {
    title: string;
    description?: string;
    columnId: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    assigneeId?: string;
    labels?: string[];
    dueDate?: string;
  }
): Promise<TaskData> {
  if (!isValidId(boardId) || !isValidId(userId) || !isValidId(payload.columnId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid board, user, or column ID');
  }

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }

  const lastTask = await prisma.task.findFirst({
    where: { columnId: payload.columnId, boardId },
    orderBy: { position: 'desc' },
  });

  const position = lastTask ? lastTask.position + 1 : 0;

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description || '',
      projectId: board.projectId,
      boardId,
      columnId: payload.columnId,
      position,
      priority: payload.priority || 'Medium',
      assigneeId: payload.assigneeId || undefined,
      createdBy: userId,
      labels: payload.labels || [],
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      version: 0,
    },
  });

  return formatTask(task);
}

export async function getTasksForBoard(boardId: string): Promise<TaskData[]> {
  if (!isValidId(boardId)) {
    return [];
  }
  const tasks = await prisma.task.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
  });
  return tasks.map(formatTask);
}

export async function getTaskById(taskId: string): Promise<TaskData | null> {
  if (!isValidId(taskId)) {
    return null;
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    return null;
  }
  return formatTask(task);
}

export async function updateTask(
  taskId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    assigneeId?: string | null;
    labels?: string[];
    dueDate?: string | null;
    expectedVersion: number;
  }
): Promise<TaskData> {
  if (!isValidId(taskId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.version !== payload.expectedVersion) {
    throw new HttpError(409, 'VERSION_CONFLICT', 'Task has been updated by another user. Please refresh.');
  }

  const updates: any = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.labels !== undefined) updates.labels = { set: payload.labels };

  if (payload.assigneeId === null) {
    updates.assigneeId = null;
  } else if (payload.assigneeId !== undefined) {
    updates.assigneeId = payload.assigneeId;
  }

  if (payload.dueDate === null) {
    updates.dueDate = null;
  } else if (payload.dueDate !== undefined) {
    updates.dueDate = new Date(payload.dueDate);
  }

  updates.version = task.version + 1;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updates,
  });

  return formatTask(updated);
}

export async function moveTask(
  taskId: string,
  payload: {
    toColumnId: string;
    toPosition: number;
    expectedVersion: number;
  }
): Promise<TaskData> {
  if (!isValidId(taskId) || !isValidId(payload.toColumnId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid task or column ID');
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.version !== payload.expectedVersion) {
    throw new HttpError(409, 'VERSION_CONFLICT', 'Task has been moved or updated by another user. Please refresh.');
  }

  const fromColumnId = task.columnId;
  const fromPosition = task.position;
  const toColumnId = payload.toColumnId;
  const toPosition = payload.toPosition;

  if (fromColumnId === toColumnId) {
    if (fromPosition !== toPosition) {
      if (fromPosition < toPosition) {
        await prisma.task.updateMany({
          where: {
            columnId: task.columnId,
            position: { gt: fromPosition, lte: toPosition },
          },
          data: { position: { decrement: 1 } },
        });
      } else {
        await prisma.task.updateMany({
          where: {
            columnId: task.columnId,
            position: { gte: toPosition, lt: fromPosition },
          },
          data: { position: { increment: 1 } },
        });
      }
    }
  } else {
    await prisma.task.updateMany({
      where: {
        columnId: task.columnId,
        position: { gt: fromPosition },
      },
      data: { position: { decrement: 1 } },
    });

    await prisma.task.updateMany({
      where: {
        columnId: toColumnId,
        position: { gte: toPosition },
      },
      data: { position: { increment: 1 } },
    });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: toColumnId,
      position: toPosition,
      version: task.version + 1,
    },
  });

  return formatTask(updated);
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!isValidId(taskId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  await prisma.task.updateMany({
    where: {
      columnId: task.columnId,
      position: { gt: task.position },
    },
    data: { position: { decrement: 1 } },
  });

  await prisma.task.delete({
    where: { id: taskId },
  });
}

function formatTask(t: any): TaskData {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    projectId: t.projectId,
    boardId: t.boardId,
    columnId: t.columnId,
    position: t.position,
    priority: t.priority,
    assigneeId: t.assigneeId || undefined,
    createdBy: t.createdBy,
    labels: t.labels,
    dueDate: t.dueDate || undefined,
    version: t.version,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface ChecklistItemData {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  projectId: string;
  boardId: string;
  columnId: string;
  status?: string;
  isCompleted?: boolean;
  projectName?: string;
  boardName?: string;
  columnName?: string;
  position: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  dependsOnTaskId?: string;
  createdBy: string;
  labels: string[];
  dueDate?: Date;
  version: number;
  isArchived: boolean;
  checklists?: ChecklistItemData[];
  createdAt: Date;
  updatedAt: Date;
}

async function resolveAssignee(assigneeId?: string | null) {
  if (!assigneeId || !isValidId(assigneeId)) return undefined;
  const u = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  return u || undefined;
}

function formatTask(t: any, assigneeUser?: any): TaskData {
  const userObj = assigneeUser || t.assignee;
  const colName = t.column?.name || t.columnName || '';
  const statusStr = colName || t.status || (t.isArchived ? 'Completed' : 'To Do');
  const isDone =
    t.isArchived ||
    statusStr.toLowerCase().includes('done') ||
    statusStr.toLowerCase().includes('complete');

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    projectId: t.projectId,
    boardId: t.boardId,
    columnId: t.columnId,
    status: statusStr,
    isCompleted: isDone,
    projectName: t.column?.board?.project?.name || t.board?.project?.name || t.project?.name || t.projectName,
    boardName: t.column?.board?.name || t.board?.name || t.boardName,
    columnName: colName || undefined,
    position: t.position,
    priority: t.priority,
    assigneeId: t.assigneeId || undefined,
    assignee: userObj
      ? {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          avatarUrl: userObj.avatarUrl || undefined,
        }
      : undefined,
    dependsOnTaskId: t.dependsOnTaskId || undefined,
    createdBy: t.createdBy,
    labels: t.labels,
    dueDate: t.dueDate || undefined,
    version: t.version,
    isArchived: t.isArchived || false,
    checklists: t.checklists || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function archiveTask(taskId: string, isArchived: boolean = true): Promise<TaskData> {
  if (!isValidId(taskId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { isArchived, version: task.version + 1 },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });
  const assigneeUser = await resolveAssignee(updated.assigneeId);
  return formatTask(updated, assigneeUser);
}

export async function getChecklistItems(taskId: string): Promise<ChecklistItemData[]> {
  if (!isValidId(taskId)) return [];
  const items = await prisma.checklistItem.findMany({
    where: { taskId },
    orderBy: { position: 'asc' },
  });
  return items;
}

export async function addChecklistItem(taskId: string, title: string): Promise<ChecklistItemData> {
  if (!isValidId(taskId) || !title.trim()) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid task ID or empty title');
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  const lastItem = await prisma.checklistItem.findFirst({
    where: { taskId },
    orderBy: { position: 'desc' },
  });
  const position = lastItem ? lastItem.position + 1 : 0;
  const item = await prisma.checklistItem.create({
    data: {
      taskId,
      title: title.trim(),
      position,
    },
  });
  return item;
}

export async function updateChecklistItem(
  itemId: string,
  payload: { title?: string; completed?: boolean }
): Promise<ChecklistItemData> {
  if (!isValidId(itemId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid checklist item ID');
  }
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new HttpError(404, 'NOT_FOUND', 'Checklist item not found');
  }
  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      title: payload.title !== undefined ? payload.title.trim() : undefined,
      completed: payload.completed !== undefined ? payload.completed : undefined,
    },
  });
  return updated;
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  if (!isValidId(itemId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid checklist item ID');
  }
  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new HttpError(404, 'NOT_FOUND', 'Checklist item not found');
  }
  await prisma.checklistItem.delete({ where: { id: itemId } });
}

export async function duplicateTask(taskId: string, userId: string): Promise<TaskData> {
  if (!isValidId(taskId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task or user ID');
  }

  const original = await prisma.task.findUnique({
    where: { id: taskId },
    include: { checklists: true },
  });

  if (!original) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const lastTask = await prisma.task.findFirst({
    where: { columnId: original.columnId },
    orderBy: { position: 'desc' },
  });

  const position = lastTask ? lastTask.position + 1 : 0;

  const duplicated = await prisma.task.create({
    data: {
      title: `${original.title} (Copy)`,
      description: original.description,
      projectId: original.projectId,
      boardId: original.boardId,
      columnId: original.columnId,
      position,
      priority: original.priority,
      assigneeId: original.assigneeId,
      createdBy: userId,
      labels: original.labels,
      dueDate: original.dueDate,
      version: 0,
      checklists: {
        create: original.checklists.map((c) => ({
          title: c.title,
          completed: false,
          position: c.position,
        })),
      },
    },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });

  const assigneeUser = await resolveAssignee(duplicated.assigneeId);
  return formatTask(duplicated, assigneeUser);
}

export async function createTask(
  boardId: string,
  userId: string,
  payload: {
    title: string;
    description?: string;
    columnId: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    assigneeId?: string | null;
    labels?: string[];
    dueDate?: string;
  }
): Promise<TaskData> {
  if (!isValidId(boardId) || !isValidId(userId) || !isValidId(payload.columnId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid input data');
  }

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }

  const column = await prisma.boardColumn.findUnique({ where: { id: payload.columnId } });
  if (!column || column.boardId !== boardId) {
    throw new HttpError(400, 'INVALID_COLUMN', 'Column does not belong to this board');
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
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });

  const assigneeUser = await resolveAssignee(task.assigneeId);
  return formatTask(task, assigneeUser);
}

export async function getTasksForBoard(boardId: string): Promise<TaskData[]> {
  if (!isValidId(boardId)) {
    return [];
  }
  const tasks = await prisma.task.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });

  const assigneeIds = Array.from(new Set(tasks.map((t) => t.assigneeId).filter(Boolean))) as string[];
  const userMap = new Map<string, any>();
  if (assigneeIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    users.forEach((u) => userMap.set(u.id, u));
  }

  return tasks.map((t) => formatTask(t, t.assigneeId ? userMap.get(t.assigneeId) : undefined));
}

export async function getTaskById(taskId: string): Promise<TaskData | null> {
  if (!isValidId(taskId)) {
    return null;
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });
  if (!task) {
    return null;
  }
  const assigneeUser = await resolveAssignee(task.assigneeId);
  return formatTask(task, assigneeUser);
}

export async function updateTask(
  taskId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    status?: string;
    columnId?: string;
    assigneeId?: string | null;
    labels?: string[];
    dueDate?: string | null;
    expectedVersion?: number;
  }
): Promise<TaskData> {
  if (!isValidId(taskId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (payload.expectedVersion !== undefined && task.version !== payload.expectedVersion) {
    throw new HttpError(409, 'VERSION_CONFLICT', 'Task has been updated by another user. Please refresh.');
  }

  const updates: any = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.labels !== undefined) updates.labels = { set: payload.labels };

  if (payload.columnId !== undefined) {
    const targetCol = await prisma.boardColumn.findUnique({ where: { id: payload.columnId } });
    if (!targetCol || targetCol.boardId !== task.boardId) {
      throw new HttpError(400, 'INVALID_COLUMN', 'Target column does not belong to this board');
    }
    updates.columnId = payload.columnId;
  } else if (payload.status !== undefined) {
    const cols = await prisma.boardColumn.findMany({ where: { boardId: task.boardId } });
    const matchCol = cols.find(
      (c) => c.name.toLowerCase().trim() === payload.status!.toLowerCase().trim() ||
             c.name.toLowerCase().includes(payload.status!.toLowerCase()) ||
             payload.status!.toLowerCase().includes(c.name.toLowerCase())
    );
    if (matchCol) {
      updates.columnId = matchCol.id;
    } else if (payload.status.toLowerCase().includes('done') || payload.status.toLowerCase().includes('complete')) {
      let doneCol = cols.find(
        (c) => c.name.toLowerCase().includes('done') || c.name.toLowerCase().includes('complete')
      );
      if (!doneCol) {
        const sorted = [...cols].sort((a, b) => b.position - a.position);
        const nextPos = sorted.length > 0 ? sorted[0].position + 1 : 0;
        doneCol = await prisma.boardColumn.create({
          data: {
            boardId: task.boardId,
            name: 'Done',
            position: nextPos,
          },
        });
      }
      updates.columnId = doneCol.id;
    }
  }

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
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });

  const assigneeUser = await resolveAssignee(updated.assigneeId);
  return formatTask(updated, assigneeUser);
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

  const toColumn = await prisma.boardColumn.findUnique({ where: { id: payload.toColumnId } });
  if (!toColumn || toColumn.boardId !== task.boardId) {
    throw new HttpError(400, 'INVALID_COLUMN', 'Target column does not belong to this board');
  }

  const fromColumnId = task.columnId;
  const fromPosition = task.position;
  const toColumnId = payload.toColumnId;
  const toPosition = payload.toPosition;

  const updated = await prisma.$transaction(async (tx) => {
    if (fromColumnId === toColumnId) {
      if (fromPosition !== toPosition) {
        if (fromPosition < toPosition) {
          await tx.task.updateMany({
            where: {
              columnId: task.columnId,
              position: { gt: fromPosition, lte: toPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else {
          await tx.task.updateMany({
            where: {
              columnId: task.columnId,
              position: { gte: toPosition, lt: fromPosition },
            },
            data: { position: { increment: 1 } },
          });
        }
      }
    } else {
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: fromPosition },
        },
        data: { position: { decrement: 1 } },
      });

      await tx.task.updateMany({
        where: {
          columnId: toColumnId,
          position: { gte: toPosition },
        },
        data: { position: { increment: 1 } },
      });
    }

    return tx.task.update({
      where: { id: taskId },
      data: {
        columnId: toColumnId,
        position: toPosition,
        version: task.version + 1,
      },
      include: {
        column: {
          select: {
            name: true,
            board: {
              select: {
                name: true,
                project: { select: { name: true } },
              },
            },
          },
        },
        checklists: { orderBy: { position: 'asc' } },
      },
    });
  });

  const assigneeUser = await resolveAssignee(updated.assigneeId);
  return formatTask(updated, assigneeUser);
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

export async function getCompletedTasksHistory(
  workspaceId: string,
  options: { search?: string; fromDate?: string; toDate?: string } = {}
): Promise<TaskData[]> {
  if (!isValidId(workspaceId)) {
    throw new HttpError(400, 'INVALID_WORKSPACE_ID', 'Invalid workspace ID');
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const whereClause: any = {
    projectId: { in: projectIds },
    OR: [
      { isArchived: true },
      { column: { name: { contains: 'Done', mode: 'insensitive' } } },
      { column: { name: { contains: 'Complete', mode: 'insensitive' } } },
    ],
  };

  if (options.search?.trim()) {
    whereClause.title = { contains: options.search.trim(), mode: 'insensitive' };
  }

  if (options.fromDate || options.toDate) {
    whereClause.updatedAt = {};
    if (options.fromDate) whereClause.updatedAt.gte = new Date(options.fromDate);
    if (options.toDate) whereClause.updatedAt.lte = new Date(options.toDate);
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const formatted = await Promise.all(
    tasks.map(async (t) => {
      const assigneeUser = await resolveAssignee(t.assigneeId);
      return formatTask(t, assigneeUser);
    })
  );

  return formatted;
}

export async function restoreTask(taskId: string): Promise<TaskData> {
  if (!isValidId(taskId)) {
    throw new HttpError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { select: { name: true } } },
  });

  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const cols = await prisma.boardColumn.findMany({
    where: { boardId: task.boardId },
    orderBy: { position: 'asc' },
  });

  const activeCol = cols.find(
    (c) => !c.name.toLowerCase().includes('done') && !c.name.toLowerCase().includes('complete')
  ) || cols[0];

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      isArchived: false,
      columnId: activeCol ? activeCol.id : task.columnId,
      version: task.version + 1,
    },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      checklists: { orderBy: { position: 'asc' } },
    },
  });

  const assigneeUser = await resolveAssignee(updated.assigneeId);
  return formatTask(updated, assigneeUser);
}

export async function pruneCompletedTasks(
  workspaceId: string,
  options: { days?: number; beforeDate?: string } = {}
): Promise<number> {
  if (!isValidId(workspaceId)) {
    throw new HttpError(400, 'INVALID_WORKSPACE_ID', 'Invalid workspace ID');
  }

  const cutoff = options.beforeDate
    ? new Date(options.beforeDate)
    : options.days !== undefined && options.days > 0
    ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000)
    : null;

  if (!cutoff) {
    return 0;
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const completedTasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      updatedAt: { lt: cutoff },
      OR: [
        { isArchived: true },
        { column: { name: { contains: 'Done', mode: 'insensitive' } } },
        { column: { name: { contains: 'Complete', mode: 'insensitive' } } },
      ],
    },
    select: { id: true },
  });

  const ids = completedTasks.map((t) => t.id);
  if (ids.length > 0) {
    await prisma.checklistItem.deleteMany({ where: { taskId: { in: ids } } });
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
  }

  return ids.length;
}

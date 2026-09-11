import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface ActivityFilterOptions {
  scope?: 'my' | 'project' | 'workspace' | 'task';
  projectId?: string;
  taskId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export async function createActivity(
  workspaceId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: {
    projectId?: string;
    boardId?: string;
    taskId?: string;
  }
): Promise<void> {
  if (!isValidId(workspaceId) || !isValidId(userId)) {
    return;
  }

  await prisma.activity.create({
    data: {
      workspaceId,
      userId,
      action,
      description,
      projectId: metadata?.projectId || undefined,
      boardId: metadata?.boardId || undefined,
      taskId: metadata?.taskId || undefined,
    },
  });
}

export async function getActivitiesForWorkspace(
  workspaceId: string,
  requestingUserId: string,
  options: ActivityFilterOptions = {}
): Promise<{ activities: any[]; totalCount: number; page: number; totalPages: number }> {
  if (!isValidId(workspaceId) || !isValidId(requestingUserId)) {
    return { activities: [], totalCount: 0, page: 1, totalPages: 0 };
  }

  const [wsMember, workspace] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requestingUserId } },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { activityRetentionDays: true },
    }),
  ]);

  if (!wsMember) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this workspace');
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = { workspaceId };

  if (workspace && workspace.activityRetentionDays > 0) {
    const cutoffDate = new Date(Date.now() - workspace.activityRetentionDays * 86400000);
    whereClause.createdAt = { gte: cutoffDate };
  }

  if (options.action) {
    whereClause.action = { contains: options.action, mode: 'insensitive' };
  }

  const userRole = (wsMember.role || '').toLowerCase();

  // 1. Scope: My Activity
  if (options.scope === 'my') {
    whereClause.userId = requestingUserId;
    if (options.projectId && isValidId(options.projectId)) {
      whereClause.projectId = options.projectId;
    }
  } 
  // 2. Scope: Project Activity
  else if (options.scope === 'project' && options.projectId && isValidId(options.projectId)) {
    // Verify user access to project
    if (userRole === 'member') {
      const projMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: options.projectId, userId: requestingUserId } },
      });
      if (!projMember) {
        throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this project');
      }
    }
    whereClause.projectId = options.projectId;
  }
  // 3. Scope: Task History
  else if (options.scope === 'task' && options.taskId && isValidId(options.taskId)) {
    const task = await prisma.task.findUnique({ where: { id: options.taskId } });
    if (!task) {
      throw new HttpError(404, 'NOT_FOUND', 'Task not found');
    }
    if (userRole === 'member') {
      const projMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: requestingUserId } },
      });
      if (!projMember) {
        throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this task');
      }
    }
    whereClause.taskId = options.taskId;
  }
  // 4. Scope: Workspace Activity (default)
  else {
    if (options.projectId && isValidId(options.projectId)) {
      whereClause.projectId = options.projectId;
    }
    // Regular members can only see workspace activity for projects they belong to
    if (userRole === 'member') {
      const projectMemberships = await prisma.projectMember.findMany({
        where: { userId: requestingUserId, project: { workspaceId } },
        select: { projectId: true },
      });
      const userProjectIds = projectMemberships.map((pm) => pm.projectId);

      if (whereClause.projectId) {
        if (!userProjectIds.includes(whereClause.projectId)) {
          throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this project activity');
        }
      } else {
        whereClause.OR = [
          { projectId: null },
          { projectId: { in: userProjectIds } },
        ];
      }
    }
  }

  const [totalCount, activities] = await Promise.all([
    prisma.activity.count({ where: whereClause }),
    prisma.activity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: true,
      },
    }),
  ]);

  const formatted = activities.map((act) => ({
    id: act.id,
    workspaceId: act.workspaceId,
    projectId: act.projectId || undefined,
    boardId: act.boardId || undefined,
    taskId: act.taskId || undefined,
    user: act.user ? {
      id: act.user.id,
      name: act.user.name,
      email: act.user.email,
    } : null,
    action: act.action,
    description: act.description,
    createdAt: act.createdAt,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    activities: formatted,
    totalCount,
    page,
    totalPages,
  };
}

export async function getActivitiesForProject(
  projectId: string,
  requestingUserId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ activities: any[]; totalCount: number; page: number; totalPages: number }> {
  if (!isValidId(projectId) || !isValidId(requestingUserId)) {
    return { activities: [], totalCount: 0, page: 1, totalPages: 0 };
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', 'Project not found');
  }

  return getActivitiesForWorkspace(project.workspaceId, requestingUserId, {
    scope: 'project',
    projectId,
    ...options,
  });
}

export async function getActivitiesForTask(
  taskId: string,
  requestingUserId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ activities: any[]; totalCount: number; page: number; totalPages: number }> {
  if (!isValidId(taskId) || !isValidId(requestingUserId)) {
    return { activities: [], totalCount: 0, page: 1, totalPages: 0 };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new HttpError(404, 'NOT_FOUND', 'Task not found');
  }

  const project = await prisma.project.findUnique({ where: { id: task.projectId } });
  if (!project) {
    throw new HttpError(404, 'NOT_FOUND', 'Project not found');
  }

  return getActivitiesForWorkspace(project.workspaceId, requestingUserId, {
    scope: 'task',
    taskId,
    ...options,
  });
}

export async function pruneExpiredActivities(workspaceId: string): Promise<number> {
  if (!isValidId(workspaceId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace ID');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { activityRetentionDays: true },
  });

  if (!workspace || workspace.activityRetentionDays <= 0) {
    return 0;
  }

  const cutoffDate = new Date(Date.now() - workspace.activityRetentionDays * 86400000);

  const deleted = await prisma.activity.deleteMany({
    where: {
      workspaceId,
      createdAt: { lt: cutoffDate },
    },
  });

  return deleted.count;
}

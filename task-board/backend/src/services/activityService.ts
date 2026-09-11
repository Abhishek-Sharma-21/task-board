import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
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

export async function getActivitiesForWorkspace(workspaceId: string): Promise<any[]> {
  if (!isValidId(workspaceId)) {
    return [];
  }

  const activities = await prisma.activity.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
    },
  });

  return activities.map((act) => ({
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
}

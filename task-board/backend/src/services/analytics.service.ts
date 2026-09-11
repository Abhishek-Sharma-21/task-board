import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface WorkspaceAnalyticsData {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  assignedToUserTasks: number;
  completedThisWeek: number;
  projectMetrics: Array<{
    id: string;
    name: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
  }>;
}

export async function getWorkspaceAnalytics(
  workspaceId: string,
  requestingUserId: string
): Promise<WorkspaceAnalyticsData> {
  if (!isValidId(workspaceId) || !isValidId(requestingUserId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requestingUserId } },
  });

  if (!wsMember) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this workspace');
  }

  const userRole = (wsMember.role || '').toLowerCase();

  // Find projects accessible by user
  let projects;
  if (userRole === 'owner' || userRole === 'admin') {
    projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  where: { isArchived: false },
                },
              },
            },
          },
        },
      },
    });
  } else {
    projects = await prisma.project.findMany({
      where: {
        workspaceId,
        members: { some: { userId: requestingUserId } },
      },
      include: {
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  where: { isArchived: false },
                },
              },
            },
          },
        },
      },
    });
  }

  const now = new Date();
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let pendingTasks = 0;
  let overdueTasks = 0;
  let assignedToUserTasks = 0;
  let completedThisWeek = 0;

  const projectMetrics = projects.map((project) => {
    let projTotal = 0;
    let projCompleted = 0;

    for (const board of project.boards) {
      for (const col of board.columns) {
        const colNameLower = col.name.toLowerCase();
        const isDoneCol = colNameLower.includes('done') || colNameLower.includes('complete');
        const isInProgressCol = colNameLower.includes('progress') || colNameLower.includes('doing') || colNameLower.includes('review');

        for (const task of col.tasks) {
          projTotal++;
          totalTasks++;

          if (task.assigneeId === requestingUserId) {
            assignedToUserTasks++;
          }

          if (isDoneCol) {
            projCompleted++;
            completedTasks++;
            if (task.updatedAt >= oneWeekAgo) {
              completedThisWeek++;
            }
          } else {
            if (isInProgressCol) {
              inProgressTasks++;
            } else {
              pendingTasks++;
            }

            if (task.dueDate && new Date(task.dueDate) < now) {
              overdueTasks++;
            }
          }
        }
      }
    }

    const completionPercentage = projTotal > 0 ? Math.round((projCompleted / projTotal) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      totalTasks: projTotal,
      completedTasks: projCompleted,
      completionPercentage,
    };
  });

  const activeProjects = projects.filter((p) => p.status.toLowerCase() === 'active').length;

  return {
    totalProjects: projects.length,
    activeProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    overdueTasks,
    assignedToUserTasks,
    completedThisWeek,
    projectMetrics,
  };
}

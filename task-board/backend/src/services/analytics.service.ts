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

  // Collect all task IDs to bulk-fetch assignees
  const allTaskIds: string[] = [];
  for (const project of projects) {
    for (const board of project.boards) {
      for (const col of board.columns) {
        for (const task of col.tasks) {
          allTaskIds.push(task.id);
        }
      }
    }
  }

  const allTaskAssignees = allTaskIds.length > 0
    ? await prisma.taskAssignee.findMany({
        where: { taskId: { in: allTaskIds } },
        select: { taskId: true, userId: true },
      })
    : [];
  const assignedTasksByUser = new Set<string>();
  allTaskAssignees.forEach((ta) => {
    if (ta.userId === requestingUserId) {
      assignedTasksByUser.add(ta.taskId);
    }
  });

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

          if (assignedTasksByUser.has(task.id)) {
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

export interface VelocityData {
  week: string;
  completed: number;
  created: number;
}

export interface BurndownData {
  day: string;
  total: number;
  remaining: number;
  completed: number;
}

export interface TaskAgingData {
  taskId: string;
  title: string;
  columnName: string;
  daysInColumn: number;
  boardName: string;
  priority: string;
}

export async function getProjectVelocity(
  _workspaceId: string,
  projectId: string,
  weeks: number = 8
): Promise<VelocityData[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - weeks * 7 * 86400000);
  const data: VelocityData[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(startDate.getTime() + w * 7 * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

    const completed = await prisma.task.count({
      where: {
        projectId,
        updatedAt: { gte: weekStart, lt: weekEnd },
        OR: [
          { isArchived: true },
          { column: { name: { contains: 'Done', mode: 'insensitive' } } },
          { column: { name: { contains: 'Complete', mode: 'insensitive' } } },
        ],
      },
    });

    const created = await prisma.task.count({
      where: {
        projectId,
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    });

    data.push({
      week: weekStart.toISOString().slice(0, 10),
      completed,
      created,
    });
  }

  return data;
}

export async function getTaskAging(
  workspaceId: string
): Promise<TaskAgingData[]> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      isArchived: false,
    },
    include: {
      column: {
        select: { name: true, board: { select: { name: true } } },
      },
    },
  });

  const now = new Date();
  return tasks
    .map((t) => {
      const entered = t.columnEnteredAt || t.createdAt;
      const days = Math.floor((now.getTime() - new Date(entered).getTime()) / 86400000);
      return {
        taskId: t.id,
        title: t.title,
        columnName: t.column?.name || '',
        daysInColumn: days,
        boardName: t.column?.board?.name || '',
        priority: t.priority,
      };
    })
    .filter((t) => t.daysInColumn >= 3)
    .sort((a, b) => b.daysInColumn - a.daysInColumn)
    .slice(0, 50);
}

import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Archived';
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createProject(
  workspaceId: string,
  userId: string,
  name: string,
  description: string = '',
  status: 'Planning' | 'Active' | 'Completed' | 'Archived' = 'Planning',
  headUserId?: string,
  memberUserIds: string[] = []
): Promise<ProjectData> {
  if (!isValidId(workspaceId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  // Validate that all specified team members belong to the workspace
  const userIdsToCheck = new Set<string>();
  if (headUserId && isValidId(headUserId)) userIdsToCheck.add(headUserId);
  for (const mId of memberUserIds) {
    if (isValidId(mId)) userIdsToCheck.add(mId);
  }

  if (userIdsToCheck.size > 0) {
    const wsMemberships = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { in: Array.from(userIdsToCheck) },
      },
    });

    if (wsMemberships.length !== userIdsToCheck.size) {
      throw new HttpError(400, 'NOT_WORKSPACE_MEMBER', 'All project team members must belong to the workspace');
    }
  }

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name,
        description,
        status,
        workspaceId,
        createdBy: userId,
      },
    });

    if (headUserId && isValidId(headUserId)) {
      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId: headUserId,
          role: 'head',
        },
      });
    }

    if (userId !== headUserId) {
      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId,
          role: headUserId ? 'member' : 'head',
        },
      });
    }

    const uniqueMemberIds = memberUserIds.filter(
      (mId) => isValidId(mId) && mId !== headUserId && mId !== userId
    );

    for (const mId of uniqueMemberIds) {
      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId: mId,
          role: 'member',
        },
      });
    }

    return p;
  });

  return project as ProjectData;
}

export async function getProjectsForWorkspace(
  workspaceId: string,
  userId?: string
): Promise<ProjectData[]> {
  if (!isValidId(workspaceId)) {
    return [];
  }

  if (!userId || !isValidId(userId)) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
    });
    return projects as ProjectData[];
  }

  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!wsMember) {
    return [];
  }

  // Workspace Owners and Admins can see all projects in the workspace
  if (wsMember.role === 'owner' || wsMember.role === 'admin') {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
    });
    return projects as ProjectData[];
  }

  // Regular workspace members only see projects they are assigned to
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      members: {
        some: { userId },
      },
    },
  });

  return projects as ProjectData[];
}

export async function getProjectById(
  projectId: string
): Promise<ProjectData | null> {
  if (!isValidId(projectId)) {
    return null;
  }
  const p = await prisma.project.findUnique({
    where: { id: projectId },
  });
  return p as ProjectData | null;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<ProjectData, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>>
): Promise<ProjectData> {
  if (!isValidId(projectId)) {
    throw new HttpError(400, 'INVALID_PROJECT_ID', 'Invalid project ID');
  }

  try {
    const p = await prisma.project.update({
      where: { id: projectId },
      data: updates,
    });
    return p as ProjectData;
  } catch (err) {
    throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!isValidId(projectId)) {
    throw new HttpError(400, 'INVALID_PROJECT_ID', 'Invalid project ID');
  }

  try {
    await prisma.projectMember.deleteMany({ where: { projectId } });
    await prisma.project.delete({
      where: { id: projectId },
    });
  } catch (err) {
    throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
}

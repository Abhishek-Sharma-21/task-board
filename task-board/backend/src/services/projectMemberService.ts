import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface ProjectMemberData {
  id: string;
  projectId: string;
  userId: string;
  role: 'head' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export async function addMemberToProject(
  projectId: string,
  userId: string,
  role: 'head' | 'member' = 'member'
): Promise<ProjectMemberData> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid project or user ID');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const isWorkspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!isWorkspaceMember) {
    throw new HttpError(403, 'NOT_WORKSPACE_MEMBER', 'User must be a workspace member to be added to a project');
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  return prisma.$transaction(async (tx) => {
    if (role === 'head') {
      const currentHead = await tx.projectMember.findFirst({
        where: { projectId, role: 'head' },
      });
      if (currentHead && currentHead.userId !== userId) {
        await tx.projectMember.update({
          where: { id: currentHead.id },
          data: { role: 'member' },
        });
      }
    }

    if (existing) {
      if (existing.role === role) {
        return existing as ProjectMemberData;
      }
      const updated = await tx.projectMember.update({
        where: { id: existing.id },
        data: { role },
      });
      return updated as ProjectMemberData;
    }

    const member = await tx.projectMember.create({
      data: { projectId, userId, role },
    });

    return member as ProjectMemberData;
  });
}

export async function removeMemberFromProject(
  projectId: string,
  userId: string
): Promise<void> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid project or user ID');
  }

  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  } catch {
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found in project');
  }
}

export async function setProjectHead(
  projectId: string,
  userId: string
): Promise<ProjectMemberData> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid project or user ID');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const isWsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!isWsMember) {
    throw new HttpError(403, 'NOT_WORKSPACE_MEMBER', 'The new Project Head must belong to the project workspace');
  }

  return prisma.$transaction(async (tx) => {
    const currentHead = await tx.projectMember.findFirst({
      where: { projectId, role: 'head' },
    });
    if (currentHead && currentHead.userId !== userId) {
      await tx.projectMember.update({
        where: { id: currentHead.id },
        data: { role: 'member' },
      });
    }

    const membership = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (membership) {
      const updated = await tx.projectMember.update({
        where: { id: membership.id },
        data: { role: 'head' },
      });
      return updated as ProjectMemberData;
    } else {
      const newHeadMember = await tx.projectMember.create({
        data: {
          projectId,
          userId,
          role: 'head',
        },
      });
      return newHeadMember as ProjectMemberData;
    }
  });
}

export async function getProjectMembers(
  projectId: string
): Promise<any[]> {
  if (!isValidId(projectId)) {
    return [];
  }
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    membershipId: m.id,
  }));
}

export async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<'head' | 'member' | null> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    return null;
  }
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return membership ? (membership.role as 'head' | 'member') : null;
}

export async function isUserProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    return false;
  }
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

export async function isUserWorkspaceAdmin(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  if (!isValidId(workspaceId) || !isValidId(userId)) {
    return false;
  }
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return !!member && (member.role === 'owner' || member.role === 'admin');
}

export async function getProjectIdForResource(
  resourceType: 'board' | 'task' | 'comment',
  resourceId: string
): Promise<string | null> {
  if (!isValidId(resourceId)) return null;

  if (resourceType === 'board') {
    const board = await prisma.board.findUnique({ where: { id: resourceId }, select: { projectId: true } });
    return board?.projectId ?? null;
  }
  if (resourceType === 'task') {
    const task = await prisma.task.findUnique({ where: { id: resourceId }, select: { projectId: true } });
    return task?.projectId ?? null;
  }
  if (resourceType === 'comment') {
    const comment = await prisma.comment.findUnique({
      where: { id: resourceId },
      select: { task: { select: { projectId: true } } },
    });
    return comment?.task.projectId ?? null;
  }
  return null;
}

export async function removeProjectMembersByWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return;

  await prisma.projectMember.deleteMany({
    where: {
      projectId: { in: projectIds },
      userId,
    },
  });
}

export async function deleteProjectMemberships(
  projectId: string
): Promise<void> {
  await prisma.projectMember.deleteMany({
    where: { projectId },
  });
}

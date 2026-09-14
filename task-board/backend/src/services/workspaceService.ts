import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';
import * as activityService from './activityService.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface WorkspaceData {
  id: string;
  name: string;
  ownerId: string;
  activityRetentionDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberData {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export async function createWorkspace(
  ownerId: string,
  name: string
): Promise<WorkspaceData> {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      ownerId,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: ownerId,
      role: 'owner',
    },
  });

  return workspace;
}

export async function getWorkspaceById(
  workspaceId: string
): Promise<WorkspaceData | null> {
  if (!isValidId(workspaceId)) {
    return null;
  }
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
}

export async function getWorkspacesForUser(
  userId: string
): Promise<WorkspaceData[]> {
  if (!isValidId(userId)) {
    return [];
  }
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  });
  return memberships.map((m) => m.workspace);
}

export async function addMemberToWorkspace(
  workspaceId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' = 'member'
): Promise<WorkspaceMemberData> {
  if (!isValidId(workspaceId) || !isValidId(userId)) {
    throw new HttpError(404, 'NOT_FOUND', 'Workspace or User not found');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  if (existing) {
    throw new HttpError(409, 'ALREADY_A_MEMBER', 'User is already a member of this workspace');
  }

  // Prevent assigning 'owner' role via normal add/invite
  const safeRole = role === 'owner' ? 'admin' : role;

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role: safeRole,
    },
  });

  return member as WorkspaceMemberData;
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  targetUserId: string,
  requesterId?: string
): Promise<void> {
  if (!isValidId(workspaceId) || !isValidId(targetUserId)) {
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found in workspace');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (workspace && workspace.ownerId === targetUserId) {
    throw new HttpError(403, 'FORBIDDEN', 'Cannot remove workspace owner');
  }

  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      await prisma.projectMember.deleteMany({
        where: {
          projectId: { in: projectIds },
          userId: targetUserId,
        },
      });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
    });

    if (requesterId) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      await activityService.createActivity(
        workspaceId,
        requesterId,
        'removed_member',
        `removed member ${targetUser?.name || targetUser?.email || 'user'} from workspace`
      );
    }
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found in workspace');
  }
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: 'owner' | 'admin' | 'member',
  requesterId?: string
): Promise<WorkspaceMemberData> {
  if (!isValidId(workspaceId) || !isValidId(targetUserId)) {
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found in workspace');
  }

  if (requesterId && requesterId === targetUserId) {
    throw new HttpError(403, 'FORBIDDEN', 'Members cannot modify their own roles');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  if (workspace.ownerId === targetUserId && newRole !== 'owner') {
    throw new HttpError(403, 'FORBIDDEN', 'Cannot downgrade the workspace owner');
  }

  if (requesterId && requesterId !== workspace.ownerId) {
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (targetMember && targetMember.role === 'owner') {
      throw new HttpError(403, 'FORBIDDEN', 'Only workspace owner can modify an owner');
    }
  }

  try {
    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
      data: { role: newRole },
    });

    if (requesterId) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      await activityService.createActivity(
        workspaceId,
        requesterId,
        'updated_role',
        `changed role of ${targetUser?.name || targetUser?.email || 'user'} to ${newRole}`
      );
    }

    return member as WorkspaceMemberData;
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found in workspace');
  }
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; activityRetentionDays?: number }
): Promise<WorkspaceData> {
  if (!isValidId(workspaceId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace ID');
  }

  try {
    const ws = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
    return ws as WorkspaceData;
  } catch (err) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }
}

export async function deleteWorkspace(
  workspaceId: string,
  requestingUserId: string
): Promise<void> {
  if (!isValidId(workspaceId) || !isValidId(requestingUserId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  if (workspace.ownerId !== requestingUserId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only workspace owner can delete workspace');
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function leaveWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  if (!isValidId(workspaceId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member) {
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'You are not a member of this workspace');
  }

  if (member.role === 'owner') {
    const otherOwnersCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: 'owner', NOT: { userId } },
    });
    if (otherOwnersCount === 0) {
      throw new HttpError(400, 'SOLE_OWNER', 'Sole owner cannot leave workspace. Transfer ownership or delete workspace.');
    }
  }

  await removeMemberFromWorkspace(workspaceId, userId);
}

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<any[]> {
  if (!isValidId(workspaceId)) {
    return [];
  }
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: true,
    },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));
}
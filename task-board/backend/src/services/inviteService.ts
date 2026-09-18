import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';
import crypto from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface InviteData {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  role: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export async function createEmailInvite(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member',
  invitedById: string
): Promise<InviteData> {
  if (!isValidId(workspaceId) || !isValidId(invitedById)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    throw new HttpError(409, 'INVITE_EXISTS', 'An active invite already exists for this email');
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const isMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (isMember) {
      throw new HttpError(409, 'ALREADY_A_MEMBER', `${existingUser.name} is already a member of this workspace`);
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      token,
      role,
      invitedById,
      expiresAt,
    },
  });

  return invite as InviteData;
}

export async function createShareableLink(
  workspaceId: string,
  invitedById: string
): Promise<InviteData> {
  if (!isValidId(workspaceId) || !isValidId(invitedById)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid workspace or user ID');
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new HttpError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: '',
      token,
      role: 'member',
      invitedById,
      expiresAt,
    },
  });

  return invite as InviteData;
}

export async function getInviteByToken(token: string): Promise<InviteData | null> {
  if (!token || token.length < 10) return null;
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  });
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt < new Date()) return null;
  return invite as InviteData;
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<void> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invite not found or has expired');
  }

  if (invite.acceptedAt) {
    throw new HttpError(410, 'INVITE_USED', 'This invite has already been accepted');
  }

  if (invite.expiresAt < new Date()) {
    throw new HttpError(410, 'INVITE_EXPIRED', 'This invite has expired');
  }

  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: invite.workspaceId, userId },
    },
  });

  if (existingMember) {
    throw new HttpError(409, 'ALREADY_A_MEMBER', 'You are already a member of this workspace');
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role as 'admin' | 'member',
      },
    });

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });
}

export async function getWorkspaceInvites(
  workspaceId: string
): Promise<InviteData[]> {
  if (!isValidId(workspaceId)) return [];
  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  return invites as InviteData[];
}

export async function revokeInvite(
  inviteId: string,
  workspaceId: string
): Promise<void> {
  if (!isValidId(inviteId) || !isValidId(workspaceId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid invite or workspace ID');
  }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite || invite.workspaceId !== workspaceId) {
    throw new HttpError(404, 'INVITE_NOT_FOUND', 'Invite not found');
  }

  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
}

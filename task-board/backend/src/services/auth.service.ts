import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { LoginInput, RegisterInput } from '../schemas.js';
import { HttpError } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

const SALT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function toPublic(u: any): PublicUser {
  return { id: u.id, name: u.name, email: u.email };
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function issueTokens(
  userId: string,
): Promise<{ accessToken: string; refreshToken: string; jti: string }> {
  const jti = randomUUID();
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId, jti),
    jti,
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Email already in use');
  }
  const passwordHash = await hashPassword(input.password);
  const newUserId = randomUUID();
  const tokens = await issueTokens(newUserId);
  const user = await prisma.user.create({
    data: {
      id: newUserId,
      name: input.name,
      email,
      passwordHash,
      refreshTokenJtis: [tokens.jti],
    },
  });

  // Automatically provision default workspace, project, board & columns for the new user
  try {
    const ws = await prisma.workspace.create({
      data: {
        name: `${user.name}'s Workspace`,
        ownerId: user.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: user.id,
        role: 'owner',
      },
    });

    const project = await prisma.project.create({
      data: {
        name: 'My First Project',
        description: 'Default project created for your workspace',
        workspaceId: ws.id,
        createdBy: user.id,
      },
    });

    const board = await prisma.board.create({
      data: {
        name: 'Main Board',
        projectId: project.id,
        createdBy: user.id,
      },
    });

    await prisma.boardColumn.createMany({
      data: [
        { name: 'To Do', boardId: board.id, position: 0 },
        { name: 'In Progress', boardId: board.id, position: 1 },
        { name: 'Review', boardId: board.id, position: 2 },
        { name: 'Done', boardId: board.id, position: 3 },
      ],
    });
  } catch (err) {
    console.error('[auth.service] Error setting up initial workspace:', err);
  }

  return { user: toPublic(user), ...tokens };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const tokens = await issueTokens(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenJtis: {
        set: [...user.refreshTokenJtis, tokens.jti],
      },
    },
  });
  return { user: toPublic(user), ...tokens };
}

export async function refresh(token: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, 'INVALID_REFRESH', 'Invalid or expired refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new HttpError(401, 'INVALID_REFRESH', 'User not found');
  }
  if (!user.refreshTokenJtis.includes(payload.jti)) {
    throw new HttpError(401, 'REVOKED_REFRESH', 'Refresh token revoked');
  }
  const updatedJtis = user.refreshTokenJtis.filter((j: string) => j !== payload.jti);
  const tokens = await issueTokens(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenJtis: {
        set: [...updatedJtis, tokens.jti],
      },
    },
  });
  return { user: toPublic(user), ...tokens };
}

export async function revokeRefresh(userId: string, jti: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenJtis: {
          set: user.refreshTokenJtis.filter((j: string) => j !== jti),
        },
      },
    });
  }
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  return u ? toPublic(u) : null;
}
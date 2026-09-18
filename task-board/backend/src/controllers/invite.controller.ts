import type { Request, Response, NextFunction } from 'express';
import * as inviteService from '../services/inviteService.js';
import * as workspaceService from '../services/workspaceService.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createEmailInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const { email, role } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Email is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const invite = await inviteService.createEmailInvite(workspaceId, email, (role as 'admin' | 'member') || 'member', req.userId);

    // Auto-provision user if they don't exist, so the workspace invite system works
    const existingUser = await import('../config/db.js').then((m) =>
      m.prisma.user.findUnique({ where: { email } })
    );
    if (!existingUser) {
      const crypto = await import('node:crypto');
      const bcrypt = await import('bcryptjs');
      const randomPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.default.hash(randomPassword, 10);
      const newUser = await import('../config/db.js').then((m) =>
        m.prisma.user.create({
          data: {
            name: email.split('@')[0],
            email,
            passwordHash,
          },
        })
      );
      await workspaceService.addMemberToWorkspace(workspaceId, newUser.id, (role as 'admin' | 'member') || 'member');
    } else {
      await workspaceService.addMemberToWorkspace(workspaceId, existingUser.id, (role as 'admin' | 'member') || 'member');
    }

    res.status(201).json({
      success: true,
      data: invite,
    });
  } catch (err) {
    next(err);
  }
}

export async function createShareableLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const invite = await inviteService.createShareableLink(workspaceId, req.userId);
    res.status(201).json({
      success: true,
      data: invite,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInviteByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    const invite = await inviteService.getInviteByToken(token);
    if (!invite) {
      res.status(404).json({ success: false, message: 'Invite not found or has expired', errorCode: 'NOT_FOUND' });
      return;
    }
    const workspace = await import('../config/db.js').then((m) =>
      m.prisma.workspace.findUnique({ where: { id: invite.workspaceId }, select: { name: true } })
    );
    res.status(200).json({
      success: true,
      data: { ...invite, workspaceName: workspace?.name || 'Workspace' },
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    await inviteService.acceptInvite(token, req.userId);
    res.status(200).json({ success: true, message: 'Successfully joined workspace' });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const invites = await inviteService.getWorkspaceInvites(workspaceId);
    res.status(200).json({
      success: true,
      data: invites,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const inviteId = requireParam(req, 'inviteId');
    await inviteService.revokeInvite(inviteId, workspaceId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

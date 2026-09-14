import type { Request, Response, NextFunction } from 'express';
import * as workspaceService from '../services/workspaceService.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput, UpdateMemberRoleInput } from '../schemas.js';
import { prisma } from '../config/db.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = CreateWorkspaceInput.parse(req.body);
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const workspace = await workspaceService.createWorkspace(req.userId, parsedBody.name);
    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const workspace = await workspaceService.getWorkspaceById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        message: 'Workspace not found',
        errorCode: 'NOT_FOUND',
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspacesForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const workspaces = await workspaceService.getWorkspacesForUser(req.userId);
    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = AddMemberInput.parse(req.body);
    const workspaceId = requireParam(req, 'id');
    // Find user by email, or auto-provision a user record if inviting a new user
    let user = await prisma.user.findUnique({ where: { email: parsedBody.email } });
    if (!user) {
      const crypto = await import('node:crypto');
      const bcrypt = await import('bcryptjs');
      const randomPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.default.hash(randomPassword, 10);
      user = await prisma.user.create({
        data: {
          name: parsedBody.email.split('@')[0],
          email: parsedBody.email,
          passwordHash,
        },
      });
    }
    const member = await workspaceService.addMemberToWorkspace(
      workspaceId,
      user.id,
      parsedBody.role
    );
    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = UpdateMemberRoleInput.parse(req.body);
    const workspaceId = requireParam(req, 'id');
    const targetUserId = requireParam(req, 'userId');
    const requesterId = req.userId;
    const member = await workspaceService.updateMemberRole(
      workspaceId,
      targetUserId,
      parsedBody.role,
      requesterId
    );
    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const targetUserId = requireParam(req, 'userId');
    const requesterId = req.userId;
    await workspaceService.removeMemberFromWorkspace(workspaceId, targetUserId, requesterId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const parsedBody = UpdateWorkspaceInput.parse(req.body);
    const workspace = await workspaceService.updateWorkspace(workspaceId, parsedBody);
    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    await workspaceService.deleteWorkspace(workspaceId, req.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function leaveWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    await workspaceService.leaveWorkspace(workspaceId, req.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'id');
    const members = await workspaceService.getWorkspaceMembers(workspaceId);
    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err) {
    next(err);
  }
}
import type { Request, Response, NextFunction } from 'express';
import * as projectMemberService from '../services/projectMemberService.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function addProjectMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const { userId, role } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    const validRole = role === 'head' ? 'head' : 'member';
    const member = await projectMemberService.addMemberToProject(projectId, userId, validRole);
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function removeProjectMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const userId = requireParam(req, 'userId');
    await projectMemberService.removeMemberFromProject(projectId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setProjectHead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    const member = await projectMemberService.setProjectHead(projectId, userId);
    res.status(200).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function getProjectMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const members = await projectMemberService.getProjectMembers(projectId);
    res.status(200).json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

import type { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activityService.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function getWorkspaceActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const activities = await activityService.getActivitiesForWorkspace(workspaceId);

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (err) {
    next(err);
  }
}

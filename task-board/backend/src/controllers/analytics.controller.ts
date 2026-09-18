import type { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service.js';
import { HttpError } from '../utils/errors.js';

export async function getWorkspaceAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) {
      throw new HttpError(400, 'BAD_REQUEST', 'Missing workspaceId parameter');
    }
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated');
    }

    const data = await analyticsService.getWorkspaceAnalytics(workspaceId, req.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectVelocity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, projectId } = req.params;
    const weeks = parseInt(req.query.weeks as string) || 8;
    const data = await analyticsService.getProjectVelocity(workspaceId, projectId, weeks);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTaskAging(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const data = await analyticsService.getTaskAging(workspaceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

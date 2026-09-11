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

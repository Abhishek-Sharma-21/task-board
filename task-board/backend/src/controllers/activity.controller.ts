import type { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activityService.js';
import { HttpError } from '../utils/errors.js';

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
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated');
    }
    const scope = (req.query.scope as any) || undefined;
    const projectId = (req.query.projectId as string) || undefined;
    const taskId = (req.query.taskId as string) || undefined;
    const action = (req.query.action as string) || undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await activityService.getActivitiesForWorkspace(workspaceId, req.userId, {
      scope,
      projectId,
      taskId,
      action,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.activities,
      meta: {
        totalCount: result.totalCount,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated');
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await activityService.getActivitiesForProject(projectId, req.userId, { page, limit });

    res.status(200).json({
      success: true,
      data: result.activities,
      meta: {
        totalCount: result.totalCount,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaskActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'taskId');
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Unauthenticated');
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await activityService.getActivitiesForTask(taskId, req.userId, { page, limit });

    res.status(200).json({
      success: true,
      data: result.activities,
      meta: {
        totalCount: result.totalCount,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function pruneWorkspaceActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const prunedCount = await activityService.pruneExpiredActivities(workspaceId);
    res.status(200).json({
      success: true,
      data: { prunedCount },
      message: `Successfully pruned ${prunedCount} expired activity log(s).`,
    });
  } catch (err) {
    next(err);
  }
}

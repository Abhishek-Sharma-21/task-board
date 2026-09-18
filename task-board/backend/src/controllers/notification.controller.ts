import type { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const notifications = await notificationService.getNotificationsForUser(userId);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notificationId = requireParam(req, 'id');
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    await notificationService.markAsRead(userId, notificationId);

    res.status(200).json({
      success: true,
      deletedIds: [notificationId],
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
}

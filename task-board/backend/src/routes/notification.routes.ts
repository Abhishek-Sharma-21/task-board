import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications - Get current user's notifications
router.get(
  '/',
  authenticate,
  controller.getNotifications
);

// PUT/PATCH /api/notifications/read-all - Mark all notifications as read
router.put(
  '/read-all',
  authenticate,
  controller.markAllAsRead
);
router.patch(
  '/read-all',
  authenticate,
  controller.markAllAsRead
);

// PUT/PATCH /api/notifications/:id/read - Mark a notification as read
router.put(
  '/:id/read',
  authenticate,
  controller.markAsRead
);
router.patch(
  '/:id/read',
  authenticate,
  controller.markAsRead
);

export default router;

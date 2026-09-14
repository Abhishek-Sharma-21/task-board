import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

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
  csrfProtection,
  controller.markAllAsRead
);
router.patch(
  '/read-all',
  authenticate,
  csrfProtection,
  controller.markAllAsRead
);

// PUT/PATCH /api/notifications/:id/read - Mark a notification as read
router.put(
  '/:id/read',
  authenticate,
  csrfProtection,
  controller.markAsRead
);
router.patch(
  '/:id/read',
  authenticate,
  csrfProtection,
  controller.markAsRead
);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/activity.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

// GET /api/workspaces/:workspaceId/activity - Get activity history for a workspace
router.get(
  '/workspaces/:workspaceId/activity',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getWorkspaceActivity
);

// GET /api/projects/:projectId/activity - Get activity history for a project
router.get(
  '/projects/:projectId/activity',
  authenticate,
  controller.getProjectActivity
);

// GET /api/tasks/:taskId/activity - Get activity history for a task
router.get(
  '/tasks/:taskId/activity',
  authenticate,
  controller.getTaskActivity
);

// POST /api/workspaces/:workspaceId/activity/prune - Prune expired activity history logs (admin/owner only)
router.post(
  '/workspaces/:workspaceId/activity/prune',
  authenticate,
  csrfProtection,
  requireWorkspaceRole('admin', 'workspaceId'),
  controller.pruneWorkspaceActivity
);

export default router;

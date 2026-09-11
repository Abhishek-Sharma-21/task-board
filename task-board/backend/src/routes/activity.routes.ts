import { Router } from 'express';
import * as controller from '../controllers/activity.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

// GET /api/workspaces/:workspaceId/activity - Get activity history for a workspace (Member/Admin/Owner)
router.get(
  '/workspaces/:workspaceId/activity',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getWorkspaceActivity
);

export default router;

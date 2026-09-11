import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

// GET /api/workspaces/:workspaceId/analytics - Get workspace dashboard metrics
router.get(
  '/workspaces/:workspaceId/analytics',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getWorkspaceAnalytics
);

export default router;

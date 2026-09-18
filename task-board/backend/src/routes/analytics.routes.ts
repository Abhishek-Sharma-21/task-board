import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

router.get(
  '/workspaces/:workspaceId/analytics',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getWorkspaceAnalytics
);

router.get(
  '/workspaces/:workspaceId/projects/:projectId/velocity',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getProjectVelocity
);

router.get(
  '/workspaces/:workspaceId/analytics/aging',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getTaskAging
);

export default router;

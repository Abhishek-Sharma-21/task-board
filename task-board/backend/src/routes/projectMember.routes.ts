import { Router } from 'express';
import * as controller from '../controllers/projectMember.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

// GET /api/projects/:projectId/members - Get project team (any project member)
router.get(
  '/projects/:projectId/members',
  authenticate,
  requireProjectRole('member', 'projectId'),
  controller.getProjectMembers
);

// POST /api/projects/:projectId/members - Add member (admin/head only)
router.post(
  '/projects/:projectId/members',
  authenticate,
  csrfProtection,
  requireProjectRole('admin', 'projectId'),
  controller.addProjectMember
);

// DELETE /api/projects/:projectId/members/:userId - Remove member (admin/head only)
router.delete(
  '/projects/:projectId/members/:userId',
  authenticate,
  csrfProtection,
  requireProjectRole('admin', 'projectId'),
  controller.removeProjectMember
);

// PATCH /api/projects/:projectId/head - Set project head (admin only)
router.patch(
  '/projects/:projectId/head',
  authenticate,
  csrfProtection,
  requireProjectRole('admin', 'projectId'),
  controller.setProjectHead
);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/invite.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

// POST /api/workspaces/:id/invites/email - send email invite (admin/owner)
router.post(
  '/workspaces/:id/invites/email',
  authenticate,
  requireWorkspaceRole('admin', 'id'),
  csrfProtection,
  controller.createEmailInvite
);

// POST /api/workspaces/:id/invites/link - generate shareable link (admin/owner)
router.post(
  '/workspaces/:id/invites/link',
  authenticate,
  requireWorkspaceRole('admin', 'id'),
  csrfProtection,
  controller.createShareableLink
);

// GET /api/workspaces/:id/invites - list pending invites (member+)
router.get(
  '/workspaces/:id/invites',
  authenticate,
  requireWorkspaceRole('member', 'id'),
  controller.getWorkspaceInvites
);

// DELETE /api/workspaces/:id/invites/:inviteId - revoke invite (admin/owner)
router.delete(
  '/workspaces/:id/invites/:inviteId',
  authenticate,
  requireWorkspaceRole('admin', 'id'),
  csrfProtection,
  controller.revokeInvite
);

// GET /api/invites/validate - validate invite token (public, no auth)
router.get('/invites/validate', controller.getInviteByToken);

// POST /api/invites/accept - accept invite (authenticated)
router.post(
  '/invites/accept',
  authenticate,
  csrfProtection,
  controller.acceptInvite
);

export default router;

import { Router } from 'express';
import { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput, UpdateMemberRoleInput } from '../schemas.js';
import * as controller from '../controllers/workspace.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// GET /api/workspaces - get all workspaces for the current user
router.get('/', authenticate, controller.getWorkspacesForUser);

// POST /api/workspaces - create a new workspace
router.post('/', authenticate, validateBody(CreateWorkspaceInput), controller.createWorkspace);

// GET /api/workspaces/:id - get a workspace by ID
router.get('/:id', authenticate, requireWorkspaceRole('member', 'id'), controller.getWorkspaceById);

// PUT /api/workspaces/:id - update workspace name (admin/owner)
router.put('/:id', authenticate, requireWorkspaceRole('admin', 'id'), validateBody(UpdateWorkspaceInput), controller.updateWorkspace);

// DELETE /api/workspaces/:id - delete workspace (owner only)
router.delete('/:id', authenticate, requireWorkspaceRole('owner', 'id'), controller.deleteWorkspace);

// POST /api/workspaces/:id/leave - leave workspace (member/admin)
router.post('/:id/leave', authenticate, requireWorkspaceRole('member', 'id'), controller.leaveWorkspace);

// POST /api/workspaces/:id/members - add a member to the workspace
router.post('/:id/members', authenticate, requireWorkspaceRole('admin', 'id'), validateBody(AddMemberInput), controller.addMember);

// GET /api/workspaces/:id/members - get all members of the workspace
router.get('/:id/members', authenticate, requireWorkspaceRole('member', 'id'), controller.getWorkspaceMembers);

// PATCH /api/workspaces/:id/members/:userId - update a member's role
router.patch('/:id/members/:userId', authenticate, requireWorkspaceRole('admin', 'id'), validateBody(UpdateMemberRoleInput), controller.updateMemberRole);

// DELETE /api/workspaces/:id/members/:userId - remove a member from the workspace
router.delete('/:id/members/:userId', authenticate, requireWorkspaceRole('admin', 'id'), controller.removeMember);

export default router;
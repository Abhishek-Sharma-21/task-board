import { Router } from 'express';
import { CreateProjectInput } from '../schemas.js';
import * as controller from '../controllers/project.controller.js';
import { authenticate, requireWorkspaceRole, requireProjectRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// Workspace-scoped project routes
// POST /api/workspaces/:workspaceId/projects - Create a new project (Admin/Owner)
router.post(
  '/workspaces/:workspaceId/projects',
  authenticate,
  csrfProtection,
  requireWorkspaceRole('admin', 'workspaceId'),
  validateBody(CreateProjectInput),
  controller.createProject
);

// GET /api/workspaces/:workspaceId/projects - List projects in workspace (Member/Admin/Owner)
router.get(
  '/workspaces/:workspaceId/projects',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getProjectsForWorkspace
);

// Project-scoped routes
// GET /api/projects/:id - Get a project by ID (Member/Admin/Owner)
router.get(
  '/projects/:id',
  authenticate,
  requireProjectRole('member', 'id'),
  controller.getProjectById
);

// PUT /api/projects/:id - Update a project by ID (Admin/Owner)
router.put(
  '/projects/:id',
  authenticate,
  csrfProtection,
  requireProjectRole('admin', 'id'),
  validateBody(CreateProjectInput.partial()),
  controller.updateProject
);

// DELETE /api/projects/:id - Delete a project by ID (Owner only)
router.delete(
  '/projects/:id',
  authenticate,
  requireProjectRole('owner', 'id'),
  controller.deleteProject
);

export default router;

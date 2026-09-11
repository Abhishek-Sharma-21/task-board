import { Router } from 'express';
import { CreateBoardInput, CreateColumnInput, ReorderColumnsInput } from '../schemas.js';
import * as controller from '../controllers/board.controller.js';
import { authenticate, requireProjectRole, requireBoardRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// Project-scoped board routes
// POST /api/projects/:projectId/boards - Create a board (Admin/Owner)
router.post(
  '/projects/:projectId/boards',
  authenticate,
  csrfProtection,
  requireProjectRole('admin', 'projectId'),
  validateBody(CreateBoardInput),
  controller.createBoard
);

// GET /api/projects/:projectId/boards - List boards in project (Member/Admin/Owner)
router.get(
  '/projects/:projectId/boards',
  authenticate,
  requireProjectRole('member', 'projectId'),
  controller.getBoardsForProject
);

// Board-scoped routes
// GET /api/boards/:id - Get a board (Member/Admin/Owner)
router.get(
  '/boards/:id',
  authenticate,
  requireBoardRole('member', 'id'),
  controller.getBoardById
);

// PUT /api/boards/:id - Update a board (Admin/Owner)
router.put(
  '/boards/:id',
  authenticate,
  csrfProtection,
  requireBoardRole('admin', 'id'),
  validateBody(CreateBoardInput.partial()),
  controller.updateBoard
);

// DELETE /api/boards/:id - Delete a board (Admin/Owner)
router.delete(
  '/boards/:id',
  authenticate,
  requireBoardRole('admin', 'id'),
  controller.deleteBoard
);

// ---------- Column Routes ----------

// POST /api/boards/:boardId/columns - Create column (Admin/Owner)
router.post(
  '/boards/:boardId/columns',
  authenticate,
  csrfProtection,
  requireBoardRole('admin', 'boardId'),
  validateBody(CreateColumnInput),
  controller.createColumn
);

// GET /api/boards/:boardId/columns - List columns in board (Member/Admin/Owner)
router.get(
  '/boards/:boardId/columns',
  authenticate,
  requireBoardRole('member', 'boardId'),
  controller.getColumnsForBoard
);

// PUT /api/boards/:boardId/columns/reorder - Reorder columns (Admin/Owner)
router.put(
  '/boards/:boardId/columns/reorder',
  authenticate,
  csrfProtection,
  requireBoardRole('admin', 'boardId'),
  validateBody(ReorderColumnsInput),
  controller.reorderColumns
);

// PUT /api/boards/:boardId/columns/:columnId - Rename column (Admin/Owner)
router.put(
  '/boards/:boardId/columns/:columnId',
  authenticate,
  csrfProtection,
  requireBoardRole('admin', 'boardId'),
  validateBody(CreateColumnInput),
  controller.updateColumn
);

// DELETE /api/boards/:boardId/columns/:columnId - Delete column (Admin/Owner)
router.delete(
  '/boards/:boardId/columns/:columnId',
  authenticate,
  requireBoardRole('admin', 'boardId'),
  controller.deleteColumn
);

export default router;

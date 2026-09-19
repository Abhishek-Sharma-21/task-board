import { Router } from 'express';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '../schemas.js';
import * as controller from '../controllers/task.controller.js';
import { authenticate, requireBoardRole, requireTaskRole, requireWorkspaceRole, requireChecklistItemRole } from '../middleware/auth.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// Board-scoped task routes
// POST /api/boards/:boardId/tasks - Create task (Member/Admin/Owner)
router.post(
  '/boards/:boardId/tasks',
  authenticate,
  requireBoardRole('member', 'boardId'),
  validateBody(CreateTaskInput),
  controller.createTask
);

// GET /api/boards/:boardId/tasks - Get tasks (Member/Admin/Owner)
router.get(
  '/boards/:boardId/tasks',
  authenticate,
  requireBoardRole('member', 'boardId'),
  controller.getTasksForBoard
);

// Task-specific routes
// GET /api/tasks/:id - Get task by ID (Member/Admin/Owner)
router.get(
  '/tasks/:id',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.getTaskById
);

// PUT /api/tasks/:id - Update task by ID (Member/Admin/Owner)
router.put(
  '/tasks/:id',
  authenticate,
  requireTaskRole('member', 'id'),
  validateBody(UpdateTaskInput),
  controller.updateTask
);

// PUT /api/tasks/:id/move - Move/Reorder task (Member/Admin/Owner)
router.put(
  '/tasks/:id/move',
  authenticate,
  requireTaskRole('member', 'id'),
  validateBody(MoveTaskInput),
  controller.moveTask
);

// DELETE /api/tasks/:id - Delete task (Admin/Owner)
router.delete(
  '/tasks/:id',
  authenticate,
  requireTaskRole('admin', 'id'),
  controller.deleteTask
);

// PATCH, POST, PUT /api/tasks/:id/archive - Archive / Restore task
router.patch(
  '/tasks/:id/archive',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.archiveTask
);
router.post(
  '/tasks/:id/archive',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.archiveTask
);
router.put(
  '/tasks/:id/archive',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.archiveTask
);

// POST /api/tasks/:id/duplicate - Duplicate task
router.post(
  '/tasks/:id/duplicate',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.duplicateTask
);

// Checklist routes
// POST /api/tasks/:taskId/checklists - Add checklist item
router.post(
  '/tasks/:taskId/checklists',
  authenticate,
  requireTaskRole('member', 'taskId'),
  controller.addChecklistItem
);

// PATCH /api/checklists/:itemId - Update checklist item
router.patch(
  '/checklists/:itemId',
  authenticate,
  requireChecklistItemRole('member', 'itemId'),
  controller.updateChecklistItem
);

// DELETE /api/checklists/:itemId - Delete checklist item
router.delete(
  '/checklists/:itemId',
  authenticate,
  requireChecklistItemRole('member', 'itemId'),
  controller.deleteChecklistItem
);

// Workspace Completed Task History & Retention
router.get(
  '/workspaces/:workspaceId/tasks/history',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getCompletedTasksHistory
);

// Workspace all tasks with due dates (for calendar)
router.get(
  '/workspaces/:workspaceId/tasks/due',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  controller.getWorkspaceTasksDue
);

router.post(
  '/workspaces/:workspaceId/tasks/history/prune',
  authenticate,
  requireWorkspaceRole('admin', 'workspaceId'),
  controller.pruneCompletedTasks
);

// Restore completed/archived task back to active board
router.post(
  '/tasks/:id/restore',
  authenticate,
  requireTaskRole('member', 'id'),
  controller.restoreTask
);

export default router;

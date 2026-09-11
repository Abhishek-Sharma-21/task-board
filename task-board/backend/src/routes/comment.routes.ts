import { Router } from 'express';
import { CreateCommentInput } from '../schemas.js';
import * as controller from '../controllers/comment.controller.js';
import { authenticate, requireTaskRole } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// POST /api/tasks/:taskId/comments - Add a comment (Member/Admin/Owner)
router.post(
  '/tasks/:taskId/comments',
  authenticate,
  csrfProtection,
  requireTaskRole('member', 'taskId'),
  validateBody(CreateCommentInput),
  controller.createComment
);

// GET /api/tasks/:taskId/comments - Get comments for a task (Member/Admin/Owner)
router.get(
  '/tasks/:taskId/comments',
  authenticate,
  requireTaskRole('member', 'taskId'),
  controller.getCommentsForTask
);

export default router;

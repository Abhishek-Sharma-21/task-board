import { Router } from 'express';
import * as templateService from '../services/templateService.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

router.get('/templates', authenticate, async (_req, res, next) => {
  try {
    const templates = await templateService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/workspaces/:workspaceId/projects/from-template',
  authenticate,
  requireWorkspaceRole('admin', 'workspaceId'),
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const userId = (req as any).userId;
      const { templateId, name, description } = req.body;
      const result = await templateService.createProjectFromTemplate(
        workspaceId, userId, templateId, name, description
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

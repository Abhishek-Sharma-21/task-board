import { Router } from 'express';
import * as automationService from '../services/automationService.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

router.get(
  '/workspaces/:workspaceId/automation-rules',
  authenticate,
  requireWorkspaceRole('member', 'workspaceId'),
  async (req, res, next) => {
    try {
      const rules = await automationService.getRulesForWorkspace(req.params.workspaceId);
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/workspaces/:workspaceId/automation-rules',
  authenticate,
  requireWorkspaceRole('admin', 'workspaceId'),
  async (req, res, next) => {
    try {
      const rule = await automationService.createRule(req.params.workspaceId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/automation-rules/:ruleId',
  authenticate,
  async (req, res, next) => {
    try {
      const rule = await automationService.updateRule(req.params.ruleId, req.body);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/automation-rules/:ruleId',
  authenticate,
  async (req, res, next) => {
    try {
      await automationService.deleteRule(req.params.ruleId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

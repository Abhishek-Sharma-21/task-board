import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidId(id: string): boolean { return UUID_REGEX.test(id); }

export interface AutomationRuleData {
  id: string;
  workspaceId: string;
  name: string;
  trigger: string;
  conditions: any;
  actions: any;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getRulesForWorkspace(workspaceId: string): Promise<AutomationRuleData[]> {
  if (!isValidId(workspaceId)) throw new HttpError(400, 'INVALID_ID', 'Invalid workspace ID');
  return prisma.automationRule.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createRule(
  workspaceId: string,
  data: { name: string; trigger: string; conditions: any; actions: any }
): Promise<AutomationRuleData> {
  if (!isValidId(workspaceId)) throw new HttpError(400, 'INVALID_ID', 'Invalid workspace ID');
  return prisma.automationRule.create({
    data: {
      workspaceId,
      name: data.name,
      trigger: data.trigger,
      conditions: data.conditions || {},
      actions: data.actions || {},
    },
  });
}

export async function updateRule(
  ruleId: string,
  data: Partial<{ name: string; trigger: string; conditions: any; actions: any; enabled: boolean }>
): Promise<AutomationRuleData> {
  if (!isValidId(ruleId)) throw new HttpError(400, 'INVALID_ID', 'Invalid rule ID');
  const existing = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Rule not found');
  return prisma.automationRule.update({ where: { id: ruleId }, data });
}

export async function deleteRule(ruleId: string): Promise<void> {
  if (!isValidId(ruleId)) throw new HttpError(400, 'INVALID_ID', 'Invalid rule ID');
  await prisma.automationRule.delete({ where: { id: ruleId } });
}

function matchConditions(conditions: any, taskData: any): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  if (conditions.priority && taskData.priority !== conditions.priority) return false;
  if (conditions.columnId && taskData.columnId !== conditions.columnId) return false;
  if (conditions.labels && conditions.labels.length > 0) {
    const taskLabels = taskData.labels || [];
    if (!conditions.labels.some((l: string) => taskLabels.includes(l))) return false;
  }
  return true;
}

export async function evaluateRules(
  workspaceId: string,
  trigger: string,
  taskData: any,
  _userId: string
): Promise<void> {
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId, enabled: true, trigger },
  });

  for (const rule of rules) {
    if (!matchConditions(rule.conditions, taskData)) continue;
    await executeActions(rule, taskData);
  }
}

async function executeActions(rule: any, taskData: any): Promise<void> {
  const actions = rule.actions as any;

  if (actions.moveToColumn && taskData.id) {
    const col = await prisma.boardColumn.findFirst({
      where: { boardId: taskData.boardId, name: { contains: actions.moveToColumn, mode: 'insensitive' } },
    });
    if (col) {
      await prisma.task.update({
        where: { id: taskData.id },
        data: { columnId: col.id, columnEnteredAt: new Date() },
      });
    }
  }

  if (actions.setPriority && taskData.id) {
    await prisma.task.update({
      where: { id: taskData.id },
      data: { priority: actions.setPriority },
    });
  }

  if (actions.markComplete && taskData.id) {
    const doneCol = await prisma.boardColumn.findFirst({
      where: { boardId: taskData.boardId, name: { contains: 'Done', mode: 'insensitive' } },
    });
    if (doneCol) {
      await prisma.task.update({
        where: { id: taskData.id },
        data: { columnId: doneCol.id, columnEnteredAt: new Date() },
      });
    }
  }

  if (actions.addLabel && taskData.id) {
    const task = await prisma.task.findUnique({ where: { id: taskData.id } });
    if (task) {
      const labels = [...new Set([...(task.labels || []), actions.addLabel])];
      await prisma.task.update({ where: { id: taskData.id }, data: { labels } });
    }
  }
}

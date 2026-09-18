import type { Task } from '../schemas';
import { parseLocalDate, todayString, dateOnly } from './dates';

export type TaskHealth = 'on_track' | 'needs_attention' | 'overdue' | 'blocked';

export interface TaskHealthResult {
  health: TaskHealth;
  label: string;
  color: string;
}

function isCompleted(task: Task): boolean {
  return (
    !!task.isCompleted ||
    !!task.isArchived ||
    (task.status?.toLowerCase().includes('done') ?? false) ||
    (task.status?.toLowerCase().includes('complete') ?? false)
  );
}

function isBlocked(task: Task): boolean {
  const colName = task.columnName?.toLowerCase() || '';
  const status = task.status?.toLowerCase() || '';
  return colName.includes('block') || status.includes('block');
}

function getDueDate(task: Task): string | null {
  if (!task.dueDate) return null;
  return parseLocalDate(task.dueDate);
}

export function getTaskHealth(task: Task): TaskHealthResult {
  if (isCompleted(task)) {
    return { health: 'on_track', label: 'ON TRACK', color: 'text-green-600' };
  }

  if (isBlocked(task)) {
    return { health: 'blocked', label: 'BLOCKED', color: 'text-red-600' };
  }

  const today = todayString();
  const threeDaysStr = (() => {
    const d = dateOnly(today);
    d.setDate(d.getDate() + 3);
    return parseLocalDate(d);
  })();

  const dueDate = getDueDate(task);
  if (dueDate) {
    if (dueDate < today) {
      return { health: 'overdue', label: 'OVERDUE', color: 'text-red-600' };
    }

    if (dueDate < threeDaysStr) {
      const checklists = task.checklists || [];
      const completed = checklists.filter((c) => c.completed).length;
      const hasIncompleteChecklist = checklists.length > 0 && completed < checklists.length;

      if (dueDate === today || hasIncompleteChecklist) {
        return { health: 'needs_attention', label: 'NEEDS ATTENTION', color: 'text-amber-600' };
      }
    }
  }

  const checklists = task.checklists || [];
  if (checklists.length > 0) {
    const completed = checklists.filter((c) => c.completed).length;
    if (completed < checklists.length && dueDate && dueDate === today) {
      return { health: 'needs_attention', label: 'NEEDS ATTENTION', color: 'text-amber-600' };
    }
  }

  return { health: 'on_track', label: 'ON TRACK', color: 'text-green-600' };
}

export function isTaskOverdue(task: Task): boolean {
  if (isCompleted(task)) return false;
  const dueDate = getDueDate(task);
  if (!dueDate) return false;
  return dueDate < todayString();
}

export function isTaskDueToday(task: Task): boolean {
  if (isCompleted(task)) return false;
  const dueDate = getDueDate(task);
  if (!dueDate) return false;
  return dueDate === todayString();
}

export function isTaskUpcoming(task: Task): boolean {
  if (isCompleted(task)) return false;
  const dueDate = getDueDate(task);
  if (!dueDate) return false;
  return dueDate > todayString();
}

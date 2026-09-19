import type { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/taskService.js';
import * as activityService from '../services/activityService.js';
import * as notificationService from '../services/notificationService.js';
import * as automationService from '../services/automationService.js';
import { broadcast } from '../sockets/socket.js';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '../schemas.js';
import { prisma } from '../config/db.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const parsedBody = CreateTaskInput.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    if (parsedBody.assigneeIds && parsedBody.assigneeIds.length > 0) {
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (board) {
        const project = await prisma.project.findUnique({ where: { id: board.projectId } });
        if (project) {
          const wsMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
          });
          const isWsAdmin = wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin');
          const callerProjectMember = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: board.projectId, userId } },
          });
          const isHead = callerProjectMember && callerProjectMember.role === 'head';
          if (!isWsAdmin && !isHead) {
            res.status(403).json({
              success: false,
              message: 'Only workspace admin or project head can assign tasks',
              errorCode: 'FORBIDDEN',
            });
            return;
          }

          for (const assigneeId of parsedBody.assigneeIds) {
            const assigneeMembership = await prisma.projectMember.findUnique({
              where: { projectId_userId: { projectId: board.projectId, userId: assigneeId } },
            });
            if (!assigneeMembership) {
              res.status(400).json({
                success: false,
                message: 'All assignees must be members of this project',
                errorCode: 'INVALID_ASSIGNEE',
              });
              return;
            }
          }
        }
      }
    }

    const task = await taskService.createTask(boardId, userId, parsedBody);

    // Resolve workspace ID to log activity
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (board) {
      const project = await prisma.project.findUnique({ where: { id: board.projectId } });
      if (project) {
        // Log Activity
        await activityService.createActivity(
          project.workspaceId,
          userId,
          'created',
          `created task "${task.title}"`,
          { projectId: project.id, boardId: board.id, taskId: task.id }
        );

        // Notify Assignees (if task is assigned on creation)
        const assigneeIds = parsedBody.assigneeIds || [];
        for (const assigneeId of assigneeIds) {
          if (assigneeId !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            await notificationService.createNotification(
              assigneeId,
              userId,
              'task_assigned',
              'Task Assigned',
              `${user?.name || 'Someone'} assigned you "${task.title}"`,
              `/workspaces/${project.workspaceId}/projects/${project.id}/boards/${board.id}`
            );
          }
        }
      }
    }

    // Broadcast real-time Socket event to the room
    broadcast(`board:${boardId}`, 'task:created', task);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTasksForBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const tasks = await taskService.getTasksForBoard(boardId);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const task = await taskService.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
        errorCode: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const parsedBody = UpdateTaskInput.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    const originalTask = await taskService.getTaskById(taskId);
    if (!originalTask) {
      res.status(404).json({ success: false, message: 'Task not found', errorCode: 'NOT_FOUND' });
      return;
    }

    if (parsedBody.assigneeIds !== undefined && parsedBody.assigneeIds.length > 0) {
      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: (await prisma.project.findUnique({ where: { id: originalTask.projectId } }))!.workspaceId, userId } },
      });
      const isWsAdmin = wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin');
      const projectMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: originalTask.projectId, userId } },
      });
      const isHead = projectMember && projectMember.role === 'head';
      if (!isWsAdmin && !isHead) {
        res.status(403).json({
          success: false,
          message: 'Only workspace admin or project head can assign tasks',
          errorCode: 'FORBIDDEN',
        });
        return;
      }
    }

    if (parsedBody.assigneeIds !== undefined && parsedBody.assigneeIds.length > 0) {
      for (const assigneeId of parsedBody.assigneeIds) {
        const assigneeMembership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: originalTask.projectId, userId: assigneeId } },
        });
        if (!assigneeMembership) {
          res.status(400).json({
            success: false,
            message: 'All assignees must be members of this project',
            errorCode: 'INVALID_ASSIGNEE',
          });
          return;
        }
      }
    }

    const task = await taskService.updateTask(taskId, parsedBody);

    // Resolve workspace details
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const metadata = { projectId: project.id, boardId: task.boardId, taskId: task.id };

      // Log assignee change
      if (parsedBody.assigneeIds !== undefined) {
        const newAssigneeIds = parsedBody.assigneeIds;
        if (newAssigneeIds.length > 0) {
          for (const assigneeId of newAssigneeIds) {
            const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
            await activityService.createActivity(
              project.workspaceId,
              userId,
              'assigned',
              `assigned task "${task.title}" to ${assignee?.name || 'someone'}`,
              metadata
            );

            if (assigneeId !== userId) {
              await notificationService.createNotification(
                assigneeId,
                userId,
                'task_assigned',
                'Task Assigned',
                `${user?.name || 'Someone'} assigned you "${task.title}"`,
                `/workspaces/${project.workspaceId}/projects/${project.id}/boards/${task.boardId}`
              );
            }
          }
        } else {
          await activityService.createActivity(
            project.workspaceId,
            userId,
            'unassigned',
            `removed assignees from task "${task.title}"`,
            metadata
          );
        }
      }

      // Log priority change
      if (parsedBody.priority !== undefined && originalTask.priority !== task.priority) {
        await activityService.createActivity(
          project.workspaceId,
          userId,
          'updated',
          `changed priority of "${task.title}" from ${originalTask.priority} to ${task.priority}`,
          metadata
        );
      }

      // Log title/desc changes
      if (parsedBody.title !== undefined && originalTask.title !== task.title) {
        await activityService.createActivity(
          project.workspaceId,
          userId,
          'updated',
          `renamed task to "${task.title}"`,
          metadata
        );
      }
    }

    // Broadcast real-time Socket event to the room
    broadcast(`board:${task.boardId}`, 'task:updated', task);

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function moveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const parsedBody = MoveTaskInput.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    // Fetch original task column
    const originalTask = await taskService.getTaskById(taskId);
    if (!originalTask) {
      res.status(404).json({ success: false, message: 'Task not found', errorCode: 'NOT_FOUND' });
      return;
    }

    const task = await taskService.moveTask(taskId, parsedBody);

    // Resolve workspace details
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const metadata = { projectId: project.id, boardId: task.boardId, taskId: task.id };

      if (originalTask.columnId !== task.columnId) {
        const fromCol = await prisma.boardColumn.findUnique({ where: { id: originalTask.columnId } });
        const toCol = await prisma.boardColumn.findUnique({ where: { id: task.columnId } });
        const colNames = `${fromCol?.name || 'Unknown'} → ${toCol?.name || 'Unknown'}`;

        await prisma.task.update({
          where: { id: taskId },
          data: { columnEnteredAt: new Date() },
        });

        await activityService.createActivity(
          project.workspaceId,
          userId,
          'moved',
          `moved task "${task.title}" (${colNames})`,
          metadata
        );

        // Notify assignees if moved by someone else
        if (task.assignees && task.assignees.length > 0) {
          for (const assignee of task.assignees) {
            if (assignee.id !== userId) {
              await notificationService.createNotification(
                assignee.id,
                userId,
                'task_moved',
                'Task Moved',
                `${user?.name || 'Someone'} moved task "${task.title}" to ${toCol?.name || 'column'}`,
                `/workspaces/${project.workspaceId}/projects/${project.id}/boards/${task.boardId}`
              );
            }
          }
        }
      } else {
        await activityService.createActivity(
          project.workspaceId,
          userId,
          'reordered',
          `reordered task "${task.title}"`,
          metadata
        );
      }
    }

    // Broadcast real-time Socket event to the room
    broadcast(`board:${task.boardId}`, 'task:moved', task);

    // Evaluate automation rules for task.moved trigger
    if (originalTask.columnId !== task.columnId && project) {
      automationService.evaluateRules(project.workspaceId, 'task.moved', task, userId).catch(() => {});
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    const task = await taskService.getTaskById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found', errorCode: 'NOT_FOUND' });
      return;
    }

    await taskService.deleteTask(taskId);

    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      await activityService.createActivity(
        project.workspaceId,
        userId,
        'deleted',
        `deleted task "${task.title}"`,
        { projectId: project.id, boardId: task.boardId }
      );
    }

    // Broadcast real-time Socket event to the room
    broadcast(`board:${task.boardId}`, 'task:deleted', { id: taskId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function archiveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const isArchived = req.body.isArchived !== undefined ? Boolean(req.body.isArchived) : true;
    const task = await taskService.archiveTask(taskId, isArchived);

    broadcast(`board:${task.boardId}`, 'task:updated', task);

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function duplicateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    const duplicated = await taskService.duplicateTask(taskId, userId);
    broadcast(`board:${duplicated.boardId}`, 'task:created', duplicated);
    res.status(201).json({
      success: true,
      data: duplicated,
    });
  } catch (err) {
    next(err);
  }
}

export async function addChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'taskId');
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Title is required', errorCode: 'BAD_REQUEST' });
      return;
    }
    const item = await taskService.addChecklistItem(taskId, title);
    const updatedTask = await taskService.getTaskById(taskId);
    if (updatedTask) {
      broadcast(`board:${updatedTask.boardId}`, 'task:updated', updatedTask);
    }
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function updateChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = requireParam(req, 'itemId');
    const { title, completed } = req.body;
    const item = await taskService.updateChecklistItem(itemId, { title, completed });
    const updatedTask = await taskService.getTaskById(item.taskId);
    if (updatedTask) {
      broadcast(`board:${updatedTask.boardId}`, 'task:updated', updatedTask);
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function deleteChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = requireParam(req, 'itemId');
    const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (item) {
      await taskService.deleteChecklistItem(itemId);
      const updatedTask = await taskService.getTaskById(item.taskId);
      if (updatedTask) {
        broadcast(`board:${updatedTask.boardId}`, 'task:updated', updatedTask);
      }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getCompletedTasksHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const { search, fromDate, toDate } = req.query;
    const tasks = await taskService.getCompletedTasksHistory(workspaceId, {
      search: typeof search === 'string' ? search : undefined,
      fromDate: typeof fromDate === 'string' ? fromDate : undefined,
      toDate: typeof toDate === 'string' ? toDate : undefined,
    });
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceTasksDue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const tasks = await taskService.getWorkspaceTasksDue(workspaceId);
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function restoreTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'id');
    const restored = await taskService.restoreTask(taskId);
    broadcast(`board:${restored.boardId}`, 'task:updated', restored);
    res.status(200).json({ success: true, data: restored });
  } catch (err) {
    next(err);
  }
}

export async function pruneCompletedTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const { days, beforeDate } = req.body;
    const prunedCount = await taskService.pruneCompletedTasks(workspaceId, {
      days: typeof days === 'number' ? days : undefined,
      beforeDate: typeof beforeDate === 'string' ? beforeDate : undefined,
    });
    res.status(200).json({
      success: true,
      data: { prunedCount },
      message: `Successfully pruned ${prunedCount} completed task(s)`,
    });
  } catch (err) {
    next(err);
  }
}

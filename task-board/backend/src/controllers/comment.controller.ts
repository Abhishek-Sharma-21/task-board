import type { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/commentService.js';
import * as activityService from '../services/activityService.js';
import * as notificationService from '../services/notificationService.js';
import { broadcast } from '../sockets/socket.js';
import { CreateCommentInput } from '../schemas.js';
import { prisma } from '../config/db.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'taskId');
    const parsedBody = CreateCommentInput.parse(req.body);
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    const comment = await commentService.createComment(taskId, userId, parsedBody.body);

    // Resolve task and project details for activity log & notifications
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
      const project = await prisma.project.findUnique({ where: { id: task.projectId } });
      if (project) {
        // Log Activity
        await activityService.createActivity(
          project.workspaceId,
          userId,
          'commented',
          `commented on task "${task.title}"`,
          { projectId: project.id, boardId: task.boardId, taskId: task.id }
        );

        // Notify Assignees
        const taskAssignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id } });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const shortBody = comment.body.length > 60 ? `${comment.body.slice(0, 60)}...` : comment.body;
        for (const ta of taskAssignees) {
          if (ta.userId !== userId) {
            await notificationService.createNotification(
              ta.userId,
              userId,
              'comment_added',
              'New Comment',
              `${user?.name || 'Someone'} commented on "${task.title}": "${shortBody}"`,
              `/workspaces/${project.workspaceId}/projects/${project.id}/boards/${task.boardId}`
            );
          }
        }

        // Mention Parsing: notify mentioned project members
        const projectMembers = await prisma.projectMember.findMany({
          where: { projectId: project.id },
          include: { user: true },
        });

        const mentionedUserIds = new Set<string>();

        for (const pm of projectMembers) {
          if (pm.userId === userId) continue;
          const nameMention = `@${pm.user.name.toLowerCase()}`;
          const emailMention = `@${pm.user.email.toLowerCase()}`;
          const bodyLower = comment.body.toLowerCase();

          if (bodyLower.includes(nameMention) || bodyLower.includes(emailMention)) {
            mentionedUserIds.add(pm.userId);
          }
        }

        for (const mentionedId of mentionedUserIds) {
          const shortBody = comment.body.length > 60 ? `${comment.body.slice(0, 60)}...` : comment.body;
          await notificationService.createNotification(
            mentionedId,
            userId,
            'comment_mention',
            'You were mentioned',
            `${user?.name || 'Someone'} mentioned you in a comment on "${task.title}": "${shortBody}"`,
            `/workspaces/${project.workspaceId}/projects/${project.id}/boards/${task.boardId}`
          );
        }

        // Broadcast real-time Socket event to the room
        broadcast(`board:${task.boardId}`, 'comment:created', comment);
      }
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCommentsForTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = requireParam(req, 'taskId');
    const comments = await commentService.getCommentsForTask(taskId);

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const commentId = requireParam(req, 'id');
    const { body } = req.body;
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      res.status(400).json({ success: false, message: 'Comment body is required', errorCode: 'BAD_REQUEST' });
      return;
    }

    const updated = await commentService.updateComment(commentId, userId, body);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const commentId = requireParam(req, 'id');
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    await commentService.deleteComment(commentId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

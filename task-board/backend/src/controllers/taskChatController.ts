import { Request, Response, NextFunction } from 'express';
import * as taskChatService from '../services/taskChatService.js';

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const beforeCursor = req.query.beforeCursor as string | undefined;

    const result = await taskChatService.getTaskChatMessages(taskId, req.userId!, limit, beforeCursor);
    res.json({ success: true, data: result.messages, nextCursor: result.nextCursor, hasMore: result.hasMore });
  } catch (err) {
    next(err);
  }
}

export async function getMessagesAround(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const timestamp = req.query.timestamp as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

    const messages = await taskChatService.getTaskChatMessagesAround(taskId, req.userId!, timestamp, limit);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

export async function searchMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const q = (req.query.q as string) || '';

    const messages = await taskChatService.searchTaskChatMessages(taskId, req.userId!, q);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const { body } = req.body;

    const message = await taskChatService.sendTaskChatMessage(taskId, req.userId!, body);
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

export async function editMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;
    const { body } = req.body;

    const message = await taskChatService.editTaskChatMessage(messageId, req.userId!, body);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { messageId } = req.params;

    const message = await taskChatService.deleteTaskChatMessage(messageId, req.userId!);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

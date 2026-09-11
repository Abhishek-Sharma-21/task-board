import type { Request, Response, NextFunction } from 'express';
import * as boardService from '../services/boardService.js';
import { broadcast } from '../sockets/socket.js';
import { CreateBoardInput, CreateColumnInput, ReorderColumnsInput } from '../schemas.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const parsedBody = CreateBoardInput.parse(req.body);
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    const board = await boardService.createBoard(
      projectId,
      req.userId,
      parsedBody.name,
      parsedBody.description
    );

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBoardsForProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'projectId');
    const boards = await boardService.getBoardsForProject(projectId);

    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBoardById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'id');
    const board = await boardService.getBoardById(boardId);

    if (!board) {
      res.status(404).json({
        success: false,
        message: 'Board not found',
        errorCode: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'id');
    const parsedBody = CreateBoardInput.partial().parse(req.body);

    const board = await boardService.updateBoard(boardId, parsedBody);

    // Broadcast board:updated
    broadcast(`board:${boardId}`, 'board:updated');

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'id');
    await boardService.deleteBoard(boardId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ---------- Column Controllers ----------

export async function createColumn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const parsedBody = CreateColumnInput.parse(req.body);

    const column = await boardService.createColumn(boardId, parsedBody.name);

    // Broadcast board:updated
    broadcast(`board:${boardId}`, 'board:updated');

    res.status(201).json({
      success: true,
      data: column,
    });
  } catch (err) {
    next(err);
  }
}

export async function getColumnsForBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const columns = await boardService.getColumnsForBoard(boardId);

    res.status(200).json({
      success: true,
      data: columns,
    });
  } catch (err) {
    next(err);
  }
}

export async function reorderColumns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const parsedBody = ReorderColumnsInput.parse(req.body);

    const columns = await boardService.reorderColumns(boardId, parsedBody.orderedIds);

    // Broadcast board:updated
    broadcast(`board:${boardId}`, 'board:updated');

    res.status(200).json({
      success: true,
      data: columns,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateColumn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const columnId = requireParam(req, 'columnId');
    const parsedBody = CreateColumnInput.parse(req.body);

    const column = await boardService.updateColumn(boardId, columnId, parsedBody.name);

    // Broadcast board:updated
    broadcast(`board:${boardId}`, 'board:updated');

    res.status(200).json({
      success: true,
      data: column,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteColumn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = requireParam(req, 'boardId');
    const columnId = requireParam(req, 'columnId');

    await boardService.deleteColumn(boardId, columnId);

    // Broadcast board:updated
    broadcast(`board:${boardId}`, 'board:updated');

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

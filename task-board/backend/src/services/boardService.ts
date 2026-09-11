import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface BoardData {
  id: string;
  name: string;
  description: string;
  projectId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardColumnData {
  id: string;
  name: string;
  boardId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createBoard(
  projectId: string,
  userId: string,
  name: string,
  description: string = ''
): Promise<BoardData> {
  if (!isValidId(projectId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid project or user ID');
  }

  const board = await prisma.board.create({
    data: {
      name,
      description,
      projectId,
      createdBy: userId,
    },
  });

  const defaultColumns = ['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'];
  for (let i = 0; i < defaultColumns.length; i++) {
    await prisma.boardColumn.create({
      data: {
        name: defaultColumns[i],
        boardId: board.id,
        position: i,
      },
    });
  }

  return board as BoardData;
}

export async function getBoardsForProject(
  projectId: string
): Promise<BoardData[]> {
  if (!isValidId(projectId)) {
    return [];
  }
  const boards = await prisma.board.findMany({
    where: { projectId },
  });
  return boards as BoardData[];
}

export async function getBoardById(
  boardId: string
): Promise<BoardData | null> {
  if (!isValidId(boardId)) {
    return null;
  }
  const b = await prisma.board.findUnique({
    where: { id: boardId },
  });
  return b as BoardData | null;
}

export async function updateBoard(
  boardId: string,
  updates: Partial<Omit<BoardData, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>>
): Promise<BoardData> {
  if (!isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_BOARD_ID', 'Invalid board ID');
  }

  try {
    const b = await prisma.board.update({
      where: { id: boardId },
      data: updates,
    });
    return b as BoardData;
  } catch (err) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  if (!isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_BOARD_ID', 'Invalid board ID');
  }

  try {
    await prisma.board.delete({
      where: { id: boardId },
    });
  } catch (err) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }
}

// ---------- Columns Operations ----------

export async function createColumn(
  boardId: string,
  name: string
): Promise<BoardColumnData> {
  if (!isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_BOARD_ID', 'Invalid board ID');
  }

  const lastColumn = await prisma.boardColumn.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
  });

  const position = lastColumn ? lastColumn.position + 1 : 0;

  const column = await prisma.boardColumn.create({
    data: {
      name,
      boardId,
      position,
    },
  });

  return column as BoardColumnData;
}

export async function getColumnsForBoard(
  boardId: string
): Promise<BoardColumnData[]> {
  if (!isValidId(boardId)) {
    return [];
  }
  const columns = await prisma.boardColumn.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
  });

  return columns as BoardColumnData[];
}

export async function reorderColumns(
  boardId: string,
  orderedIds: string[]
): Promise<BoardColumnData[]> {
  if (!isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_BOARD_ID', 'Invalid board ID');
  }

  const updates = orderedIds.map((id, index) =>
    prisma.boardColumn.update({
      where: { id, boardId },
      data: { position: index },
    })
  );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return getColumnsForBoard(boardId);
}

export async function deleteColumn(
  boardId: string,
  columnId: string
): Promise<void> {
  if (!isValidId(columnId) || !isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_COLUMN_ID', 'Invalid column ID');
  }

  try {
    await prisma.boardColumn.delete({
      where: { id: columnId, boardId },
    });
  } catch (err) {
    throw new HttpError(404, 'COLUMN_NOT_FOUND', 'Column not found');
  }
}

export async function updateColumn(
  boardId: string,
  columnId: string,
  name: string
): Promise<BoardColumnData> {
  if (!isValidId(columnId) || !isValidId(boardId)) {
    throw new HttpError(400, 'INVALID_COLUMN_ID', 'Invalid column ID');
  }

  try {
    const column = await prisma.boardColumn.update({
      where: { id: columnId, boardId },
      data: { name },
    });
    return column as BoardColumnData;
  } catch (err) {
    throw new HttpError(404, 'COLUMN_NOT_FOUND', 'Column not found');
  }
}

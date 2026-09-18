import { HttpError } from '../utils/errors.js';
import { prisma } from '../config/db.js';
import { broadcast } from '../sockets/socket.js';
import { createNotification } from './notificationService.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface TaskChatMessageData {
  id: string;
  taskId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  body: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function validateTaskAccess(taskId: string, userId: string) {
  if (!isValidId(taskId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid task or user ID');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      boardId: true,
      projectId: true,
      title: true,
    },
  });

  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const wsMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId,
    },
  });

  if (!wsMember) {
    throw new HttpError(403, 'FORBIDDEN', 'Access denied to task chat');
  }

  return { task, workspaceMember: wsMember, workspaceId: project.workspaceId };
}

export async function getTaskChatMessages(
  taskId: string,
  userId: string,
  limit: number = 30,
  beforeCursor?: string
): Promise<{ messages: TaskChatMessageData[]; nextCursor: string | null; hasMore: boolean }> {
  await validateTaskAccess(taskId, userId);

  const take = Math.min(Math.max(limit, 1), 100);

  let whereClause: any = { taskId };
  if (beforeCursor && isValidId(beforeCursor)) {
    const cursorMsg = await prisma.taskChatMessage.findUnique({
      where: { id: beforeCursor },
      select: { createdAt: true },
    });
    if (cursorMsg) {
      whereClause.createdAt = { lt: cursorMsg.createdAt };
    }
  }

  const rawMessages = await prisma.taskChatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  const hasMore = rawMessages.length > take;
  const items = hasMore ? rawMessages.slice(0, take) : rawMessages;

  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  // Reverse so client receives chronological order (oldest to newest)
  const messages = items.reverse().map(formatChatMessage);

  return { messages, nextCursor, hasMore };
}

export async function getTaskChatMessagesAround(
  taskId: string,
  userId: string,
  timestamp: string,
  limit: number = 30
): Promise<TaskChatMessageData[]> {
  await validateTaskAccess(taskId, userId);

  const targetDate = new Date(timestamp);
  if (isNaN(targetDate.getTime())) {
    throw new HttpError(400, 'INVALID_TIMESTAMP', 'Invalid date timestamp');
  }

  const half = Math.floor(limit / 2);

  const beforeMsgs = await prisma.taskChatMessage.findMany({
    where: { taskId, createdAt: { lte: targetDate } },
    orderBy: { createdAt: 'desc' },
    take: half,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const afterMsgs = await prisma.taskChatMessage.findMany({
    where: { taskId, createdAt: { gt: targetDate } },
    orderBy: { createdAt: 'asc' },
    take: half,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const combined = [...beforeMsgs.reverse(), ...afterMsgs];
  return combined.map(formatChatMessage);
}

export async function searchTaskChatMessages(
  taskId: string,
  userId: string,
  query: string
): Promise<TaskChatMessageData[]> {
  await validateTaskAccess(taskId, userId);

  if (!query || !query.trim()) {
    return [];
  }

  const q = query.trim();

  const results = await prisma.taskChatMessage.findMany({
    where: {
      taskId,
      isDeleted: false,
      OR: [
        { body: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return results.map(formatChatMessage);
}

export async function sendTaskChatMessage(
  taskId: string,
  userId: string,
  body: string
): Promise<TaskChatMessageData> {
  if (!body || !body.trim()) {
    throw new HttpError(400, 'INVALID_BODY', 'Message body cannot be empty');
  }

  const { task } = await validateTaskAccess(taskId, userId);

  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    select: { workspaceId: true },
  });

  const created = await prisma.taskChatMessage.create({
    data: {
      taskId,
      userId,
      body: body.trim(),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const formatted = formatChatMessage(created);

  // Broadcast real-time message event to board room
  broadcast(`board:${task.boardId}`, 'chat:messageCreated', formatted);

  const senderName = created.user?.name || 'A team member';

  // Build target user set to notify (Assignees, Creator, Project Members, Chat Participants)
  const targetUserIds = new Set<string>();

  const taskAssignees = await prisma.taskAssignee.findMany({ where: { taskId } });
  taskAssignees.forEach((ta) => targetUserIds.add(ta.userId));
  const fullTask = await prisma.task.findUnique({ where: { id: taskId }, select: { createdBy: true } });
  if (fullTask?.createdBy) targetUserIds.add(fullTask.createdBy);

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: task.projectId },
    select: { userId: true },
  });
  projectMembers.forEach((pm) => targetUserIds.add(pm.userId));

  const previousParticipants = await prisma.taskChatMessage.findMany({
    where: { taskId },
    select: { userId: true },
    distinct: ['userId'],
  });
  previousParticipants.forEach((p) => targetUserIds.add(p.userId));

  // Dispatch standard message notifications (excluding sender)
  for (const recipientId of targetUserIds) {
    if (recipientId === userId) continue;
    await createNotification(
      recipientId,
      userId,
      'comment_added',
      `New Chat Message: ${task.title}`,
      `${senderName}: "${body.slice(0, 100)}"`,
      `/workspaces/${project?.workspaceId}/projects/${task.projectId}/boards/${task.boardId}`
    );
  }

  // Parse @mentions for explicit mention notifications
  const mentions = Array.from(new Set((body.match(/@([A-Za-z0-9_. -]+)/g) || []).map((m) => m.slice(1).trim())));
  if (mentions.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        name: { in: mentions, mode: 'insensitive' },
        id: { not: userId },
      },
      select: { id: true },
    });

    for (const mu of mentionedUsers) {
      await createNotification(
        mu.id,
        userId,
        'comment_mention',
        `Mention in Task Chat: ${task.title}`,
        `${senderName} mentioned you: "${body.slice(0, 100)}"`,
        `/workspaces/${project?.workspaceId}/projects/${task.projectId}/boards/${task.boardId}`
      );
    }
  }

  return formatted;
}

export async function editTaskChatMessage(
  messageId: string,
  userId: string,
  body: string
): Promise<TaskChatMessageData> {
  if (!isValidId(messageId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid message or user ID');
  }

  if (!body || !body.trim()) {
    throw new HttpError(400, 'INVALID_BODY', 'Message body cannot be empty');
  }

  const existing = await prisma.taskChatMessage.findUnique({
    where: { id: messageId },
    include: { task: true },
  });

  if (!existing) {
    throw new HttpError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  if (existing.userId !== userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only message author can edit this message');
  }

  const updated = await prisma.taskChatMessage.update({
    where: { id: messageId },
    data: {
      body: body.trim(),
      isEdited: true,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const formatted = formatChatMessage(updated);
  broadcast(`board:${existing.task.boardId}`, 'chat:messageUpdated', formatted);
  return formatted;
}

export async function deleteTaskChatMessage(
  messageId: string,
  userId: string
): Promise<TaskChatMessageData> {
  if (!isValidId(messageId) || !isValidId(userId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Invalid message or user ID');
  }

  const existing = await prisma.taskChatMessage.findUnique({
    where: { id: messageId },
    include: { task: true },
  });

  if (!existing) {
    throw new HttpError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  if (existing.userId !== userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only message author can delete this message');
  }

  const updated = await prisma.taskChatMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      body: '[This message was deleted]',
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const formatted = formatChatMessage(updated);
  broadcast(`board:${existing.task.boardId}`, 'chat:messageDeleted', formatted);
  return formatted;
}

function formatChatMessage(msg: any): TaskChatMessageData {
  return {
    id: msg.id,
    taskId: msg.taskId,
    userId: msg.userId,
    user: {
      id: msg.user.id,
      name: msg.user.name,
      email: msg.user.email,
      avatarUrl: msg.user.avatarUrl || '',
    },
    body: msg.isDeleted ? '[This message was deleted]' : msg.body,
    isEdited: msg.isEdited,
    isDeleted: msg.isDeleted,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
  };
}

import { prisma } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function createNotification(
  userId: string,
  senderId: string,
  type: 'task_assigned' | 'task_moved' | 'comment_added' | 'project_added' | 'comment_mention' | 'task_updated' | 'project_status_changed',
  title: string,
  message: string,
  link?: string
): Promise<any> {
  if (!isValidId(userId) || !isValidId(senderId)) {
    return null;
  }
  // Don't send notification to yourself
  if (userId === senderId) return null;

  const notif = await prisma.notification.create({
    data: {
      userId,
      senderId,
      type,
      title,
      message,
      read: false,
      link,
    },
  });

  return notif;
}

export async function getNotificationsForUser(userId: string): Promise<any[]> {
  if (!isValidId(userId)) {
    return [];
  }
  const notifs = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: true,
    },
  });

  return notifs.map((n) => ({
    id: n.id,
    userId: n.userId,
    sender: n.sender ? {
      id: n.sender.id,
      name: n.sender.name,
      email: n.sender.email,
    } : null,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt,
  }));
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  if (!isValidId(notificationId) || !isValidId(userId)) {
    return;
  }
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (!isValidId(userId)) {
    return;
  }
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

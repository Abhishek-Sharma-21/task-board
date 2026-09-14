export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  user?: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
  memberCount?: number;
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  createdAt?: string;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  status?: string;
  isCompleted?: boolean;
  projectName?: string;
  boardName?: string;
  columnName?: string;
  priority: 'Low' | 'Medium' | 'High';
  assigneeId?: string | null;
  assignee?: User | null;
  assignees?: User[];
  dueDate?: string | null;
  labels?: string[];
  checklist?: Array<{ id: string; title: string; completed: boolean }>;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChatMessage {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
  actor?: User;
}

export interface ActivityItem {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
  user?: User;
}

export type MobileScreen =
  | 'splash'
  | 'login'
  | 'register'
  | 'home'
  | 'mywork'
  | 'calendar'
  | 'notifications'
  | 'workspaces'
  | 'projects'
  | 'create-project'
  | 'board'
  | 'create-task'
  | 'task-details'
  | 'chat'
  | 'activity'
  | 'members'
  | 'settings'
  | 'profile';

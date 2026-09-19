export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  activityRetentionDays?: number;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  healthStatus?: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'head' | 'member';
  user: User;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  boardId: string;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  boardId: string;
  columnId: string;
  position: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  labels: string[];
  dueDate?: string;
  version: number;
  isArchived: boolean;
  columnEnteredAt?: string;
  dependsOnTaskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignees?: User[];
  checklist?: ChecklistItem[];
  commentCount?: number;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChatMessage {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  isEdited: boolean;
  isDeleted: boolean;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  sender?: User;
  createdAt: string;
}

export interface Activity {
  id: string;
  workspaceId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  userId: string;
  action: string;
  description: string;
  user: User;
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  role: 'admin' | 'member';
  invitedById: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
}

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  enabled: boolean;
}

export interface WorkspaceAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  tasksByPriority: Record<string, number>;
  tasksByProject: { projectId: string; projectName: string; count: number }[];
}

export interface VelocityData {
  sprintName: string;
  committed: number;
  completed: number;
}

export interface AgingData {
  taskId: string;
  taskTitle: string;
  columnName: string;
  daysInColumn: number;
  projectName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

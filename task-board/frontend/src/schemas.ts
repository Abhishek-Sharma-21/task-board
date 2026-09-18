import { z } from 'zod';

// ---------- Enums ----------
export const WorkspaceRole = z.enum(['owner', 'admin', 'member']);
export type WorkspaceRole = z.infer<typeof WorkspaceRole>;

export const ProjectStatus = z.enum(['Planning', 'Active', 'Completed', 'Archived']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const TaskPriority = z.enum(['Low', 'Medium', 'High', 'Urgent']);
export type TaskPriority = z.infer<typeof TaskPriority>;

// ---------- API error envelope ----------
export const ApiError = z.object({
  success: z.literal(false),
  message: z.string(),
  errorCode: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

export const ApiOk = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
});
export type ApiOk = z.infer<typeof ApiOk>;

export const ApiResponse = z.union([ApiOk, ApiError]);
export type ApiResponse = z.infer<typeof ApiResponse>;

// ---------- Auth ----------
export const RegisterInput = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

// ---------- Auth Responses ----------
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponse = z.object({
  user: UserSchema,
  accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponse>;

// ---------- Workspace ----------
export const CreateWorkspaceInput = z.object({
  name: z.string().min(1).max(80),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const UpdateWorkspaceInput = z.object({
  name: z.string().min(1).max(80),
});
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInput>;

export const AddMemberInput = z.object({
  email: z.string().email(),
  role: WorkspaceRole.default('member'),
});
export type AddMemberInput = z.infer<typeof AddMemberInput>;

export const UpdateMemberRoleInput = z.object({
  role: WorkspaceRole,
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInput>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceRole,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

// ---------- Project ----------
export const CreateProjectInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
  status: ProjectStatus.default('Planning'),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: ProjectStatus,
  workspaceId: z.string(),
  createdBy: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type Project = z.infer<typeof ProjectSchema>;

// ---------- Board / Column ----------
export const CreateBoardInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
});
export type CreateBoardInput = z.infer<typeof CreateBoardInput>;

export const CreateColumnInput = z.object({
  name: z.string().min(1).max(80),
});
export type CreateColumnInput = z.infer<typeof CreateColumnInput>;

export const ReorderColumnsInput = z.object({
  orderedIds: z.array(z.string()).min(1),
});
export type ReorderColumnsInput = z.infer<typeof ReorderColumnsInput>;

// ---------- Task ----------
export const CreateTaskInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  columnId: z.string(),
  priority: TaskPriority.default('Medium'),
  assigneeIds: z.array(z.string()).optional().default([]),
  labels: z.array(z.string().max(40)).max(20).optional().default([]),
  dueDate: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      if (val === null || val === '') return undefined;
      return val;
    }, z.string().datetime().optional()),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: TaskPriority.optional(),
  assigneeIds: z.array(z.string()).optional(),
  labels: z.array(z.string().max(40)).max(20).optional(),
  dueDate: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      if (val === null || val === '') return null;
      return val;
    },
    z.string().datetime().nullable().optional()
  ),
  expectedVersion: z.number().int().nonnegative(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const MoveTaskInput = z.object({
  toColumnId: z.string(),
  toPosition: z.number().int().nonnegative(),
  expectedVersion: z.number().int().nonnegative(),
});
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;

// ---------- Comment ----------
export const CreateCommentInput = z.object({
  body: z.string().min(1).max(4000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const UpdateCommentInput = z.object({
  body: z.string().min(1).max(4000),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentInput>;

// ---------- Socket events (payloads only) ----------
export const BoardJoinPayload = z.object({ boardId: z.string() });
export const TaskEditingPayload = z.object({ taskId: z.string() });
export type BoardJoinPayload = z.infer<typeof BoardJoinPayload>;
export type TaskEditingPayload = z.infer<typeof TaskEditingPayload>;

// ---------- Board, BoardColumn, Task Models ----------
export const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  projectId: z.string(),
  createdBy: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type Board = z.infer<typeof BoardSchema>;

export const BoardColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  boardId: z.string(),
  position: z.number(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type BoardColumn = z.infer<typeof BoardColumnSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  position: z.number(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  projectId: z.string(),
  boardId: z.string(),
  columnId: z.string(),
  status: z.string().optional(),
  isCompleted: z.boolean().optional(),
  projectName: z.string().optional(),
  boardName: z.string().optional(),
  columnName: z.string().optional(),
  position: z.number(),
  priority: TaskPriority,
  assignees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().optional(),
  })).optional().default([]),
  createdBy: z.string(),
  labels: z.array(z.string()),
  dueDate: z.union([z.date(), z.string()]).nullable().optional(),
  version: z.number(),
  isArchived: z.boolean().optional(),
  checklists: z.array(ChecklistItemSchema).optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type Task = z.infer<typeof TaskSchema>;

export const CommentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  body: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type Comment = z.infer<typeof CommentSchema>;

// ---------- Project Members ----------
export const ProjectMemberRole = z.enum(['head', 'member']);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRole>;

export const ProjectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: ProjectMemberRole,
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

export const ProjectMemberListItem = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: ProjectMemberRole,
  membershipId: z.string(),
});
export type ProjectMemberListItem = z.infer<typeof ProjectMemberListItem>;

export const AddProjectMemberInput = z.object({
  userId: z.string(),
  role: ProjectMemberRole.default('member'),
});
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberInput>;

export const SetProjectHeadInput = z.object({
  userId: z.string(),
});
export type SetProjectHeadInput = z.infer<typeof SetProjectHeadInput>;

export const TaskChatMessageSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().optional(),
  }),
  body: z.string(),
  isEdited: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  status: z.enum(['sending', 'sent', 'failed']).optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type TaskChatMessage = z.infer<typeof TaskChatMessageSchema>;

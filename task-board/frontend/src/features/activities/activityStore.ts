import { create } from 'zustand';
import { api } from '../../api/client';

export interface Activity {
  id: string;
  workspaceId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  description: string;
  createdAt: string;
}

interface ActivityState {
  activities: Activity[];
  scope: 'my' | 'project' | 'workspace' | 'task';
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  actionFilter: string | null;
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  setScope: (scope: 'my' | 'project' | 'workspace' | 'task') => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setActionFilter: (action: string | null) => void;
  setPage: (page: number) => void;

  fetchActivities: (
    workspaceId: string,
    options?: {
      scope?: 'my' | 'project' | 'workspace' | 'task';
      projectId?: string | null;
      taskId?: string | null;
      action?: string | null;
      page?: number;
      limit?: number;
    }
  ) => Promise<void>;
  fetchTaskHistory: (taskId: string) => Promise<Activity[]>;
  resetWorkspaceActivities: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  scope: 'workspace',
  selectedProjectId: null,
  selectedTaskId: null,
  actionFilter: null,
  page: 1,
  limit: 20,
  totalCount: 0,
  totalPages: 1,
  isLoading: false,
  error: null,

  setScope: (scope) => set({ scope, page: 1 }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId, page: 1 }),
  setActionFilter: (actionFilter) => set({ actionFilter, page: 1 }),
  setPage: (page) => set({ page }),

  resetWorkspaceActivities: () => {
    set({
      activities: [],
      scope: 'workspace',
      selectedProjectId: null,
      selectedTaskId: null,
      actionFilter: null,
      page: 1,
      totalCount: 0,
      totalPages: 1,
      error: null,
    });
  },

  fetchActivities: async (workspaceId, options = {}) => {
    set({ isLoading: true, error: null });
    const current = get();
    const scope = options.scope !== undefined ? options.scope : current.scope;
    const projectId = options.projectId !== undefined ? options.projectId : current.selectedProjectId;
    const taskId = options.taskId !== undefined ? options.taskId : current.selectedTaskId;
    const action = options.action !== undefined ? options.action : current.actionFilter;
    const page = options.page !== undefined ? options.page : current.page;
    const limit = options.limit !== undefined ? options.limit : current.limit;

    try {
      const params = new URLSearchParams();
      if (scope) params.append('scope', scope);
      if (projectId) params.append('projectId', projectId);
      if (taskId) params.append('taskId', taskId);
      if (action) params.append('action', action);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get<{
        success: true;
        data: Activity[];
        meta: { totalCount: number; page: number; totalPages: number };
      }>(`/workspaces/${workspaceId}/activity?${params.toString()}`);

      set({
        activities: response.data.data,
        totalCount: response.data.meta?.totalCount || 0,
        page: response.data.meta?.page || 1,
        totalPages: response.data.meta?.totalPages || 1,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to fetch activity history',
        isLoading: false,
        activities: [],
      });
    }
  },

  fetchTaskHistory: async (taskId) => {
    try {
      const res = await api.get<{ success: true; data: Activity[] }>(`/tasks/${taskId}/activity`);
      return res.data.data;
    } catch (err: any) {
      return [];
    }
  },
}));

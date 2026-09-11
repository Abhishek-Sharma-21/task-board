import { create } from 'zustand';
import { api } from '../../api/client';

export interface ProjectMetric {
  id: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

export interface WorkspaceAnalytics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  assignedToUserTasks: number;
  completedThisWeek: number;
  projectMetrics: ProjectMetric[];
}

interface AnalyticsState {
  analytics: WorkspaceAnalytics | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaceAnalytics: (workspaceId: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  analytics: null,
  isLoading: false,
  error: null,
  fetchWorkspaceAnalytics: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: boolean; data: WorkspaceAnalytics }>(
        `/workspaces/${workspaceId}/analytics`
      );
      set({ analytics: response.data.data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to load workspace analytics',
        isLoading: false,
      });
    }
  },
}));

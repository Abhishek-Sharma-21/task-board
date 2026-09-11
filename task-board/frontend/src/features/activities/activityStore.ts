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
  isLoading: boolean;
  error: string | null;

  fetchActivities: (workspaceId: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  isLoading: false,
  error: null,

  fetchActivities: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: true; data: Activity[] }>(`/workspaces/${workspaceId}/activity`);
      set({ activities: response.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch activity history', isLoading: false });
    }
  },
}));

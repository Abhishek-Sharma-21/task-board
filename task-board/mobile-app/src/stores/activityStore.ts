import { create } from 'zustand';
import api from '../api/client';
import { Activity } from '../types';

interface ActivityState {
  activities: Activity[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  fetchActivities: (workspaceId: string, filters?: Record<string, string>, reset?: boolean) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  isLoading: false,
  page: 1,
  hasMore: true,

  fetchActivities: async (workspaceId: string, filters?: Record<string, string>, reset = false) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const page = reset ? 1 : get().page;
      const params = new URLSearchParams({ page: String(page), limit: '30', ...filters });
      const { data } = await api.get(`/workspaces/${workspaceId}/activity?${params.toString()}`);
      const activities = data.data;
      set((state) => ({
        activities: reset ? activities : [...state.activities, ...activities],
        page: page + 1,
        hasMore: activities.length === 30,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },
}));

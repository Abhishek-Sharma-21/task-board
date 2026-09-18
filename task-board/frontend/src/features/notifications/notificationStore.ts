import { create } from 'zustand';
import { api } from '../../api/client';

export interface Notification {
  id: string;
  userId: string;
  sender: {
    id: string;
    name: string;
    email: string;
  } | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  resetWorkspaceNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isLoading: false,
  error: null,

  resetWorkspaceNotifications: () => set({ notifications: [], error: null }),

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: true; data: Notification[] }>('/notifications');
      set({ notifications: response.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch notifications', isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to mark notification as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set({ notifications: [] });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to mark all notifications as read' });
    }
  },
}));

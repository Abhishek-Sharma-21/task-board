import { create } from 'zustand';
import { api } from '../../api/client';
import type { ProjectMemberListItem } from '../../schemas';

interface ProjectMemberState {
  members: ProjectMemberListItem[];
  isLoading: boolean;
  error: string | null;
  fetchMembers: (projectId: string) => Promise<void>;
  addMember: (projectId: string, userId: string, role?: 'head' | 'member') => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;
  setHead: (projectId: string, userId: string) => Promise<void>;
}

export const useProjectMemberStore = create<ProjectMemberState>((set) => ({
  members: [],
  isLoading: false,
  error: null,

  fetchMembers: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: true; data: ProjectMemberListItem[] }>(`/projects/${projectId}/members`);
      set({ members: res.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch project members', isLoading: false });
    }
  },

  addMember: async (projectId, userId, role = 'member') => {
    set({ error: null });
    try {
      await api.post(`/projects/${projectId}/members`, { userId, role });
      const res = await api.get<{ success: true; data: ProjectMemberListItem[] }>(`/projects/${projectId}/members`);
      set({ members: res.data.data });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add member';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  removeMember: async (projectId, userId) => {
    set({ error: null });
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      set((state) => ({ members: state.members.filter((m) => m.id !== userId) }));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to remove member';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setHead: async (projectId, userId) => {
    set({ error: null });
    try {
      await api.patch(`/projects/${projectId}/head`, { userId });
      const res = await api.get<{ success: true; data: ProjectMemberListItem[] }>(`/projects/${projectId}/members`);
      set({ members: res.data.data });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to set project head';
      set({ error: msg });
      throw new Error(msg);
    }
  },
}));

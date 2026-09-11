import { create } from 'zustand';
import { api } from '../../api/client';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  fetchMembers: (workspaceId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  changeMemberRole: (workspaceId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: true; data: Workspace[] }>('/workspaces');
      const workspaces = res.data.data;
      set({ workspaces, isLoading: false });
      if (workspaces.length > 0 && !get().activeWorkspace) {
        // Default to first workspace
        await get().selectWorkspace(workspaces[0].id);
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch workspaces', isLoading: false });
    }
  },

  selectWorkspace: async (workspaceId) => {
    const ws = get().workspaces.find((w) => w.id === workspaceId) || null;
    if (ws) {
      set({ activeWorkspace: ws });
      // Fetch members for active workspace
      await get().fetchMembers(workspaceId);
    }
  },

  createWorkspace: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: true; data: Workspace }>('/workspaces', { name });
      const newWs = res.data.data;
      set((state) => ({
        workspaces: [...state.workspaces, newWs],
        activeWorkspace: state.activeWorkspace ? state.activeWorkspace : newWs,
        isLoading: false,
      }));
      if (!get().activeWorkspace || get().activeWorkspace?.id === newWs.id) {
        await get().selectWorkspace(newWs.id);
      }
      return newWs;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create workspace';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  deleteWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      set((state) => {
        const filtered = state.workspaces.filter((w) => w.id !== workspaceId);
        const nextActive = state.activeWorkspace?.id === workspaceId ? (filtered[0] || null) : state.activeWorkspace;
        return {
          workspaces: filtered,
          activeWorkspace: nextActive,
          isLoading: false,
        };
      });
      if (get().activeWorkspace) {
        await get().selectWorkspace(get().activeWorkspace!.id);
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete workspace', isLoading: false });
    }
  },

  fetchMembers: async (workspaceId) => {
    try {
      const res = await api.get<{ success: true; data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
      set({ members: res.data.data });
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
    }
  },

  inviteMember: async (workspaceId, email, role) => {
    try {
      await api.post(`/workspaces/${workspaceId}/members`, { email, role });
      await get().fetchMembers(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to invite member');
    }
  },

  changeMemberRole: async (workspaceId, userId, role) => {
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
      await get().fetchMembers(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update member role');
    }
  },

  removeMember: async (workspaceId, userId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      await get().fetchMembers(workspaceId);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to remove member');
    }
  },
}));

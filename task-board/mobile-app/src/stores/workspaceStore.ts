import { create } from 'zustand';
import api from '../api/client';
import { Workspace, WorkspaceMember, Project } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  projects: Project[];
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  fetchMembers: (workspaceId: string) => Promise<void>;
  fetchProjects: (workspaceId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: string) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  projects: [],
  isLoading: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/workspaces');
      const workspaces = data.data;
      set({ workspaces, isLoading: false });
      if (!get().activeWorkspace && workspaces.length > 0) {
        set({ activeWorkspace: workspaces[0] });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

  createWorkspace: async (name: string) => {
    const { data } = await api.post('/workspaces', { name });
    const workspace = data.data;
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    return workspace;
  },

  fetchMembers: async (workspaceId: string) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      set({ members: data.data });
    } catch {}
  },

  fetchProjects: async (workspaceId: string) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/projects`);
      set({ projects: data.data });
    } catch {}
  },

  inviteMember: async (workspaceId: string, email: string, role: string) => {
    await api.post(`/workspaces/${workspaceId}/members`, { email, role });
  },

  removeMember: async (workspaceId: string, userId: string) => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    set((state) => ({
      members: state.members.filter((m) => m.id !== userId),
    }));
  },
}));

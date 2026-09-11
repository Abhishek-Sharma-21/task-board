import { create } from 'zustand';
import { api } from '../../api/client';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Archived';
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: (workspaceId: string) => Promise<void>;
  selectProject: (projectId: string) => void;
  createProject: (workspaceId: string, name: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, payload: { name?: string; description?: string; status?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: true; data: Project[] }>(`/workspaces/${workspaceId}/projects`);
      const projects = res.data.data;
      set({ projects, isLoading: false });
      if (projects.length > 0 && !get().activeProject) {
        set({ activeProject: projects[0] });
      } else if (projects.length === 0) {
        set({ activeProject: null });
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', isLoading: false });
    }
  },

  selectProject: (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId) || null;
    set({ activeProject: proj });
  },

  createProject: async (workspaceId, name, description = '') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: true; data: Project }>(`/workspaces/${workspaceId}/projects`, {
        name,
        description,
      });
      const newProj = res.data.data;
      set((state) => ({
        projects: [...state.projects, newProj],
        activeProject: state.activeProject ? state.activeProject : newProj,
        isLoading: false,
      }));
      if (!get().activeProject || get().activeProject?.id === newProj.id) {
        set({ activeProject: newProj });
      }
      return newProj;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create project';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  updateProject: async (projectId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put<{ success: true; data: Project }>(`/projects/${projectId}`, payload);
      const updated = res.data.data;
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
        activeProject: state.activeProject?.id === projectId ? updated : state.activeProject,
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update project';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  deleteProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/projects/${projectId}`);
      set((state) => {
        const filtered = state.projects.filter((p) => p.id !== projectId);
        const nextActive = state.activeProject?.id === projectId ? (filtered[0] || null) : state.activeProject;
        return {
          projects: filtered,
          activeProject: nextActive,
          isLoading: false,
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete project', isLoading: false });
    }
  },
}));

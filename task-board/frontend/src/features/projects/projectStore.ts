import { create } from 'zustand';
import { api } from '../../api/client';
import { useWorkspaceStore } from '../workspaces/workspaceStore';

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
  projectsLoaded: boolean;
  lastFetchedWorkspaceId: string | null;
  lastProjectsFetchedAt: number | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: (workspaceId: string, force?: boolean) => Promise<void>;
  selectProject: (projectId: string) => void;
  createProject: (
    workspaceId: string,
    name: string,
    description?: string,
    headUserId?: string,
    memberUserIds?: string[]
  ) => Promise<Project>;
  updateProject: (projectId: string, payload: { name?: string; description?: string; status?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  clearProjects: () => void;
  resetWorkspaceProjects: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  projectsLoaded: false,
  lastFetchedWorkspaceId: null,
  lastProjectsFetchedAt: null,
  isLoading: false,
  error: null,

  clearProjects: () => {
    set({
      projects: [],
      activeProject: null,
      projectsLoaded: false,
      lastFetchedWorkspaceId: null,
      lastProjectsFetchedAt: null,
    });
  },

  resetWorkspaceProjects: () => {
    set({
      projects: [],
      activeProject: null,
      projectsLoaded: false,
      lastFetchedWorkspaceId: null,
      lastProjectsFetchedAt: null,
      error: null,
    });
  },

  fetchProjects: async (workspaceId, force = false) => {
    const state = get();
    const isCached =
      !force &&
      state.projectsLoaded &&
      state.lastFetchedWorkspaceId === workspaceId &&
      state.lastProjectsFetchedAt &&
      Date.now() - state.lastProjectsFetchedAt < 60000;

    if (isCached) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: true; data: Project[] }>(`/workspaces/${workspaceId}/projects`);
      const projects = res.data.data;
      
      // Verify active workspace has not changed during async call
      const activeWsId = useWorkspaceStore.getState().activeWorkspace?.id;
      if (activeWsId && activeWsId !== workspaceId) {
        return;
      }

      const currentActiveId = get().activeProject?.id;
      const matchingActive = projects.find((p) => p.id === currentActiveId);
      set({
        projects,
        activeProject: matchingActive || (projects.length > 0 ? projects[0] : null),
        projectsLoaded: true,
        lastFetchedWorkspaceId: workspaceId,
        lastProjectsFetchedAt: Date.now(),
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', isLoading: false, projects: [], activeProject: null });
    }
  },

  selectProject: (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId) || null;
    set({ activeProject: proj });
  },

  createProject: async (workspaceId, name, description = '', headUserId, memberUserIds = []) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: true; data: Project }>(`/workspaces/${workspaceId}/projects`, {
        name,
        description,
        headUserId,
        memberUserIds,
      });
      const newProj = res.data.data;
      set((state) => ({
        projects: [...state.projects, newProj],
        activeProject: newProj,
        projectsLoaded: true,
        lastFetchedWorkspaceId: workspaceId,
        lastProjectsFetchedAt: Date.now(),
        isLoading: false,
      }));
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
        const remaining = state.projects.filter((p) => p.id !== projectId);
        return {
          projects: remaining,
          activeProject: state.activeProject?.id === projectId ? (remaining[0] || null) : state.activeProject,
          isLoading: false,
        };
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to delete project';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },
}));

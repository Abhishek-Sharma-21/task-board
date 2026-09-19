import { create } from 'zustand';
import api from '../api/client';
import { Project } from '../types';

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: 'head' | 'member';
  membershipId: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  projectMembers: ProjectMember[];
  isLoading: boolean;
  fetchProjects: (workspaceId: string) => Promise<void>;
  setActiveProject: (project: Project) => void;
  createProject: (workspaceId: string, name: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<void>;
  addProjectMember: (projectId: string, userId: string, role?: 'head' | 'member') => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  setProjectHead: (projectId: string, userId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  projectMembers: [],
  isLoading: false,

  fetchProjects: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/projects`);
      set({ projects: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveProject: (project) => set({ activeProject: project }),

  createProject: async (workspaceId: string, name: string, description?: string) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/projects`, { name, description });
    const project = data.data;
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  updateProject: async (projectId: string, updateData: Partial<Project>) => {
    const { data } = await api.put(`/projects/${projectId}`, updateData);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...data.data } : p)),
    }));
  },

  deleteProject: async (projectId: string) => {
    await api.delete(`/projects/${projectId}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
  },

  fetchProjectMembers: async (projectId: string) => {
    try {
      const { data } = await api.get(`/projects/${projectId}/members`);
      set({ projectMembers: data.data || [] });
    } catch {
      set({ projectMembers: [] });
    }
  },

  addProjectMember: async (projectId: string, userId: string, role: 'head' | 'member' = 'member') => {
    await api.post(`/projects/${projectId}/members`, { userId, role });
    const { data } = await api.get(`/projects/${projectId}/members`);
    set({ projectMembers: data.data || [] });
  },

  removeProjectMember: async (projectId: string, userId: string) => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    set((state) => ({
      projectMembers: state.projectMembers.filter((m) => m.membershipId !== userId && m.id !== userId),
    }));
  },

  setProjectHead: async (projectId: string, userId: string) => {
    await api.patch(`/projects/${projectId}/head`, { userId });
    const { data } = await api.get(`/projects/${projectId}/members`);
    set({ projectMembers: data.data || [] });
  },
}));

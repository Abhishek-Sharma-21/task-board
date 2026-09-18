import { create } from 'zustand';
import { api } from '../../api/client';
import { useProjectStore } from '../projects/projectStore';
import { useBoardStore } from '../boards/boardStore';
import { useActivityStore } from '../activities/activityStore';
import { useNotificationStore } from '../notifications/notificationStore';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  activityRetentionDays?: number;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  role: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  membersLoaded: boolean;
  lastFetchedWorkspaceId: string | null;
  lastMembersFetchedAt: number | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: (preferredWorkspaceId?: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  resetWorkspaceScopedState: () => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: { name?: string; activityRetentionDays?: number }) => Promise<Workspace>;
  pruneActivityLogs: (workspaceId: string) => Promise<number>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  fetchMembers: (workspaceId: string, force?: boolean) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  changeMemberRole: (workspaceId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  fetchInvites: (workspaceId: string) => Promise<void>;
  createInviteLink: (workspaceId: string) => Promise<WorkspaceInvite>;
  revokeInvite: (workspaceId: string, inviteId: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;

  completedTasks: any[];
  isCompletedTasksLoading: boolean;
  fetchCompletedTasks: (workspaceId: string, params?: { search?: string; fromDate?: string; toDate?: string }) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  pruneCompletedTasks: (workspaceId: string, days?: number, beforeDate?: string) => Promise<number>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  invites: [],
  membersLoaded: false,
  lastFetchedWorkspaceId: null,
  lastMembersFetchedAt: null,
  isLoading: false,
  error: null,

  resetWorkspaceScopedState: () => {
    // Reset dependent workspace stores
    useProjectStore.getState().resetWorkspaceProjects();
    useBoardStore.getState().resetWorkspaceBoards();
    useActivityStore.getState().resetWorkspaceActivities();
    useNotificationStore.getState().resetWorkspaceNotifications();

    set({
      members: [],
      membersLoaded: false,
      lastFetchedWorkspaceId: null,
      lastMembersFetchedAt: null,
    });
  },

  fetchWorkspaces: async (preferredWorkspaceId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ success: true; data: Workspace[] }>('/workspaces');
      const workspaces = res.data.data;
      set({ workspaces, isLoading: false });
      
      const urlMatch = window.location.pathname.match(/\/workspaces\/([a-f0-9-]+)/i);
      const urlWorkspaceId = urlMatch ? urlMatch[1] : null;

      const savedWorkspaceId = localStorage.getItem('tb_active_workspace');
      const currentActiveId = get().activeWorkspace?.id;
      const targetId =
        (preferredWorkspaceId && preferredWorkspaceId !== 'undefined' ? preferredWorkspaceId : null) ||
        (urlWorkspaceId && urlWorkspaceId !== 'undefined' ? urlWorkspaceId : null) ||
        currentActiveId ||
        savedWorkspaceId;

      const matchedWs = workspaces.find((w) => w.id === targetId);
      if (matchedWs) {
        await get().selectWorkspace(matchedWs.id);
      } else if (workspaces.length > 0) {
        await get().selectWorkspace(workspaces[0].id);
      } else {
        set({ activeWorkspace: null, members: [] });
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch workspaces', isLoading: false });
    }
  },

  selectWorkspace: async (workspaceId) => {
    const currentActiveId = get().activeWorkspace?.id;
    const ws = get().workspaces.find((w) => w.id === workspaceId) || null;

    if (currentActiveId !== workspaceId) {
      get().resetWorkspaceScopedState();
    }

    if (ws) {
      set({ activeWorkspace: ws });
      localStorage.setItem('tb_active_workspace', workspaceId);
      await get().fetchMembers(workspaceId);
    } else {
      localStorage.removeItem('tb_active_workspace');
      set({ activeWorkspace: null });
    }
  },

  createWorkspace: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ success: true; data: Workspace }>('/workspaces', { name });
      const newWs = res.data.data;
      set((state) => ({
        workspaces: [...state.workspaces, newWs],
        isLoading: false,
      }));
      await get().selectWorkspace(newWs.id);
      return newWs;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create workspace';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  updateWorkspace: async (workspaceId, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put<{ success: true; data: Workspace }>(`/workspaces/${workspaceId}`, data);
      const updated = res.data.data;
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updated : w)),
        activeWorkspace: state.activeWorkspace?.id === workspaceId ? updated : state.activeWorkspace,
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update workspace';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  pruneActivityLogs: async (workspaceId) => {
    try {
      const res = await api.post<{ success: true; data: { prunedCount: number }; message: string }>(
        `/workspaces/${workspaceId}/activity/prune`
      );
      return res.data.data.prunedCount;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to prune activity logs');
    }
  },

  deleteWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      const remaining = get().workspaces.filter((w) => w.id !== workspaceId);
      set({ workspaces: remaining, isLoading: false });
      const nextWs = remaining[0] || null;
      if (nextWs) {
        await get().selectWorkspace(nextWs.id);
      } else {
        set({ activeWorkspace: null, members: [] });
        localStorage.removeItem('tb_active_workspace');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to delete workspace';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  leaveWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/workspaces/${workspaceId}/leave`);
      const remaining = get().workspaces.filter((w) => w.id !== workspaceId);
      set({ workspaces: remaining, isLoading: false });
      const nextWs = remaining[0] || null;
      if (nextWs) {
        await get().selectWorkspace(nextWs.id);
      } else {
        set({ activeWorkspace: null, members: [] });
        localStorage.removeItem('tb_active_workspace');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to leave workspace';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  fetchMembers: async (workspaceId, force = false) => {
    const state = get();
    const isCached =
      !force &&
      state.membersLoaded &&
      state.lastFetchedWorkspaceId === workspaceId &&
      state.lastMembersFetchedAt &&
      Date.now() - state.lastMembersFetchedAt < 60000;

    if (isCached) {
      return;
    }

    try {
      const res = await api.get<{ success: true; data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
      // Prevent race conditions: verify active workspace has not changed
      if (get().activeWorkspace?.id === workspaceId) {
        set({
          members: res.data.data,
          membersLoaded: true,
          lastFetchedWorkspaceId: workspaceId,
          lastMembersFetchedAt: Date.now(),
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
    }
  },

  inviteMember: async (workspaceId, email, role) => {
    try {
      await api.post(`/workspaces/${workspaceId}/members`, { email, role });
      await get().fetchMembers(workspaceId, true);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to invite member');
    }
  },

  changeMemberRole: async (workspaceId, userId, role) => {
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
      await get().fetchMembers(workspaceId, true);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update member role');
    }
  },

  removeMember: async (workspaceId, userId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      await get().fetchMembers(workspaceId, true);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to remove member');
    }
  },

  fetchInvites: async (workspaceId) => {
    try {
      const res = await api.get<{ success: true; data: WorkspaceInvite[] }>(`/workspaces/${workspaceId}/invites`);
      if (get().activeWorkspace?.id === workspaceId) {
        set({ invites: res.data.data });
      }
    } catch (err: any) {
      console.error('Failed to fetch invites:', err);
    }
  },

  createInviteLink: async (workspaceId) => {
    try {
      const res = await api.post<{ success: true; data: WorkspaceInvite }>(`/workspaces/${workspaceId}/invites/link`);
      const invite = res.data.data;
      set((state) => ({ invites: [invite, ...state.invites] }));
      return invite;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create invite link');
    }
  },

  revokeInvite: async (workspaceId, inviteId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
      set((state) => ({ invites: state.invites.filter((i) => i.id !== inviteId) }));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to revoke invite');
    }
  },

  acceptInvite: async (token) => {
    try {
      await api.post('/invites/accept', { token });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to accept invite');
    }
  },

  completedTasks: [],
  isCompletedTasksLoading: false,

  fetchCompletedTasks: async (workspaceId, params = {}) => {
    set({ isCompletedTasksLoading: true });
    try {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.fromDate) q.append('fromDate', params.fromDate);
      if (params.toDate) q.append('toDate', params.toDate);

      const res = await api.get<{ success: true; data: any[] }>(
        `/workspaces/${workspaceId}/tasks/history?${q.toString()}`
      );
      set({ completedTasks: res.data.data, isCompletedTasksLoading: false });
    } catch (err: any) {
      console.error('Failed to fetch completed tasks history:', err);
      set({ isCompletedTasksLoading: false });
    }
  },

  restoreTask: async (taskId) => {
    try {
      await api.post<{ success: true; data: any }>(`/tasks/${taskId}/restore`);
      set((state) => ({
        completedTasks: state.completedTasks.filter((t) => t.id !== taskId),
      }));
      const activeWs = get().activeWorkspace;
      if (activeWs) {
        useProjectStore.getState().fetchProjects(activeWs.id);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to restore task');
    }
  },

  pruneCompletedTasks: async (workspaceId, days, beforeDate) => {
    try {
      const res = await api.post<{ success: true; data: { prunedCount: number } }>(
        `/workspaces/${workspaceId}/tasks/history/prune`,
        { days, beforeDate }
      );
      await get().fetchCompletedTasks(workspaceId);
      return res.data.data.prunedCount;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to prune completed tasks');
    }
  },
}));

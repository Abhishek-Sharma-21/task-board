import { create } from 'zustand';
import { api } from '../../api/client';
import type { Comment } from '../../schemas';

interface CommentState {
  commentsByTask: Record<string, Comment[]>;
  isLoading: boolean;
  error: string | null;

  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<Comment>;
  updateComment: (taskId: string, commentId: string, body: string) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  addCommentRealtime: (taskId: string, comment: Comment) => void;
}

export const useCommentStore = create<CommentState>((set) => ({
  commentsByTask: {},
  isLoading: false,
  error: null,

  fetchComments: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: true; data: Comment[] }>(`/tasks/${taskId}/comments`);
      set((state) => ({
        commentsByTask: {
          ...state.commentsByTask,
          [taskId]: response.data.data,
        },
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch comments', isLoading: false });
    }
  },

  addComment: async (taskId, body) => {
    set({ error: null });
    try {
      const response = await api.post<{ success: true; data: Comment }>(`/tasks/${taskId}/comments`, { body });
      const comment = response.data.data;
      set((state) => {
        const currentList = state.commentsByTask[taskId] || [];
        return {
          commentsByTask: {
            ...state.commentsByTask,
            [taskId]: [...currentList, comment],
          },
        };
      });
      return comment;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to submit comment' });
      throw err;
    }
  },

  updateComment: async (taskId, commentId, body) => {
    set({ error: null });
    try {
      const response = await api.put<{ success: true; data: Comment }>(`/comments/${commentId}`, { body });
      const updated = response.data.data;
      set((state) => {
        const currentList = state.commentsByTask[taskId] || [];
        return {
          commentsByTask: {
            ...state.commentsByTask,
            [taskId]: currentList.map((c) => (c.id === commentId ? updated : c)),
          },
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update comment' });
      throw err;
    }
  },

  deleteComment: async (taskId, commentId) => {
    set({ error: null });
    try {
      await api.delete(`/comments/${commentId}`);
      set((state) => {
        const currentList = state.commentsByTask[taskId] || [];
        return {
          commentsByTask: {
            ...state.commentsByTask,
            [taskId]: currentList.filter((c) => c.id !== commentId),
          },
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete comment' });
      throw err;
    }
  },

  addCommentRealtime: (taskId, comment) => {
    set((state) => {
      const currentList = state.commentsByTask[taskId] || [];
      if (currentList.some((c) => c.id === comment.id)) {
        return {}; // Already exists in list
      }
      return {
        commentsByTask: {
          ...state.commentsByTask,
          [taskId]: [...currentList, comment],
        },
      };
    });
  },
}));

import { create } from 'zustand';
import { api } from '../../api/client';
import type { Comment } from '../../schemas';

interface CommentState {
  commentsByTask: Record<string, Comment[]>;
  isLoading: boolean;
  error: string | null;

  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<Comment>;
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

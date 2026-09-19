import { create } from 'zustand';
import api from '../api/client';
import { Comment } from '../types';

interface CommentState {
  commentsByTask: Record<string, Comment[]>;
  isLoading: boolean;
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<Comment>;
  updateComment: (commentId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string, taskId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set) => ({
  commentsByTask: {},
  isLoading: false,

  fetchComments: async (taskId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/tasks/${taskId}/comments`);
      set((state) => ({
        commentsByTask: { ...state.commentsByTask, [taskId]: data.data },
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  addComment: async (taskId: string, body: string) => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { body });
    const comment = data.data;
    set((state) => ({
      commentsByTask: {
        ...state.commentsByTask,
        [taskId]: [...(state.commentsByTask[taskId] || []), comment],
      },
    }));
    return comment;
  },

  updateComment: async (commentId: string, body: string) => {
    const { data } = await api.put(`/comments/${commentId}`, { body });
    const updated = data.data;
    set((state) => {
      const newComments = { ...state.commentsByTask };
      for (const taskId of Object.keys(newComments)) {
        newComments[taskId] = newComments[taskId].map((c) =>
          c.id === commentId ? { ...c, ...updated } : c
        );
      }
      return { commentsByTask: newComments };
    });
  },

  deleteComment: async (commentId: string, taskId: string) => {
    await api.delete(`/comments/${commentId}`);
    set((state) => ({
      commentsByTask: {
        ...state.commentsByTask,
        [taskId]: (state.commentsByTask[taskId] || []).filter((c) => c.id !== commentId),
      },
    }));
  },
}));

import { create } from 'zustand';
import api from '../api/client';
import { TaskChatMessage } from '../types';

interface ChatState {
  messagesByTask: Record<string, TaskChatMessage[]>;
  typingUsersByTask: Record<string, { userId: string; name: string }[]>;
  hasMoreByTask: Record<string, boolean>;
  isLoading: boolean;
  fetchMessages: (taskId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (taskId: string, body: string) => Promise<TaskChatMessage>;
  updateMessage: (messageId: string, body: string) => Promise<void>;
  deleteMessage: (messageId: string, taskId: string) => Promise<void>;
  addMessage: (message: TaskChatMessage) => void;
  setTyping: (taskId: string, userId: string, name: string) => void;
  removeTyping: (taskId: string, userId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByTask: {},
  typingUsersByTask: {},
  hasMoreByTask: {},
  isLoading: false,

  fetchMessages: async (taskId: string, loadMore = false) => {
    set({ isLoading: true });
    try {
      const existing = loadMore ? get().messagesByTask[taskId] || [] : [];
      const beforeCursor = loadMore && existing.length > 0 ? existing[0].id : undefined;
      const params = new URLSearchParams({ limit: '50' });
      if (beforeCursor) params.append('beforeCursor', beforeCursor);

      const { data } = await api.get(`/tasks/${taskId}/chat/messages?${params.toString()}`);
      const messages: TaskChatMessage[] = data.data;
      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: loadMore ? [...messages, ...existing] : messages,
        },
        hasMoreByTask: { ...state.hasMoreByTask, [taskId]: data.hasMore },
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: async (taskId: string, body: string) => {
    const { data } = await api.post(`/tasks/${taskId}/chat/messages`, { body });
    const message = data.data;
    set((state) => {
      const existing = state.messagesByTask[taskId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: [...existing, message],
        },
      };
    });
    return message;
  },

  updateMessage: async (messageId: string, body: string) => {
    const { data } = await api.put(`/chat/messages/${messageId}`, { body });
    const updated = data.data;
    set((state) => {
      const newMessages = { ...state.messagesByTask };
      for (const taskId of Object.keys(newMessages)) {
        newMessages[taskId] = newMessages[taskId].map((m) =>
          m.id === messageId ? { ...m, ...updated } : m
        );
      }
      return { messagesByTask: newMessages };
    });
  },

  deleteMessage: async (messageId: string, taskId: string) => {
    await api.delete(`/chat/messages/${messageId}`);
    set((state) => ({
      messagesByTask: {
        ...state.messagesByTask,
        [taskId]: (state.messagesByTask[taskId] || []).map((m) =>
          m.id === messageId ? { ...m, isDeleted: true } : m
        ),
      },
    }));
  },

  addMessage: (message: TaskChatMessage) => {
    set((state) => {
      const existing = state.messagesByTask[message.taskId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTask: {
          ...state.messagesByTask,
          [message.taskId]: [...existing, message],
        },
      };
    });
  },

  setTyping: (taskId: string, userId: string, name: string) => {
    set((state) => {
      const current = state.typingUsersByTask[taskId] || [];
      if (current.some((u) => u.userId === userId)) return state;
      return {
        typingUsersByTask: {
          ...state.typingUsersByTask,
          [taskId]: [...current, { userId, name }],
        },
      };
    });
  },

  removeTyping: (taskId: string, userId: string) => {
    set((state) => ({
      typingUsersByTask: {
        ...state.typingUsersByTask,
        [taskId]: (state.typingUsersByTask[taskId] || []).filter((u) => u.userId !== userId),
      },
    }));
  },
}));

import { create } from 'zustand';
import { api } from '../../api/client';
import type { TaskChatMessage } from '../../schemas';

interface TaskChatState {
  messagesByTask: Record<string, TaskChatMessage[]>;
  nextCursorByTask: Record<string, string | null>;
  hasMoreByTask: Record<string, boolean>;
  isLoadingByTask: Record<string, boolean>;
  isLoadingMoreByTask: Record<string, boolean>;
  errorByTask: Record<string, string | null>;

  searchResults: TaskChatMessage[];
  isSearching: boolean;
  searchQuery: string;

  typingUsersByTask: Record<string, Record<string, string>>;

  fetchMessages: (taskId: string, limit?: number) => Promise<void>;
  fetchOlderMessages: (taskId: string) => Promise<number>;
  fetchMessagesAround: (taskId: string, timestamp: string) => Promise<void>;
  searchMessages: (taskId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  sendMessage: (taskId: string, body: string, currentUser: { id: string; name: string; email: string; avatarUrl?: string }) => Promise<void>;
  retrySendMessage: (taskId: string, tempId: string) => Promise<void>;
  editMessage: (taskId: string, messageId: string, body: string) => Promise<void>;
  deleteMessage: (taskId: string, messageId: string) => Promise<void>;

  addOrUpdateRealtimeMessage: (taskId: string, message: TaskChatMessage) => void;
  setTypingUser: (taskId: string, userId: string, name: string) => void;
  removeTypingUser: (taskId: string, userId: string) => void;
}

export const useTaskChatStore = create<TaskChatState>((set, get) => ({
  messagesByTask: {},
  nextCursorByTask: {},
  hasMoreByTask: {},
  isLoadingByTask: {},
  isLoadingMoreByTask: {},
  errorByTask: {},

  searchResults: [],
  isSearching: false,
  searchQuery: '',
  typingUsersByTask: {},

  fetchMessages: async (taskId, limit = 30) => {
    set((state) => ({
      isLoadingByTask: { ...state.isLoadingByTask, [taskId]: true },
      errorByTask: { ...state.errorByTask, [taskId]: null },
    }));

    try {
      const response = await api.get<{
        success: true;
        data: TaskChatMessage[];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/tasks/${taskId}/chat/messages?limit=${limit}`);

      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: response.data.data,
        },
        nextCursorByTask: {
          ...state.nextCursorByTask,
          [taskId]: response.data.nextCursor,
        },
        hasMoreByTask: {
          ...state.hasMoreByTask,
          [taskId]: response.data.hasMore,
        },
        isLoadingByTask: { ...state.isLoadingByTask, [taskId]: false },
      }));
    } catch (err: any) {
      set((state) => ({
        errorByTask: {
          ...state.errorByTask,
          [taskId]: err.response?.data?.message || 'Failed to fetch task messages',
        },
        isLoadingByTask: { ...state.isLoadingByTask, [taskId]: false },
      }));
    }
  },

  fetchOlderMessages: async (taskId) => {
    const cursor = get().nextCursorByTask[taskId];
    const hasMore = get().hasMoreByTask[taskId];
    const isMoreLoading = get().isLoadingMoreByTask[taskId];

    if (!cursor || !hasMore || isMoreLoading) return 0;

    set((state) => ({
      isLoadingMoreByTask: { ...state.isLoadingMoreByTask, [taskId]: true },
    }));

    try {
      const response = await api.get<{
        success: true;
        data: TaskChatMessage[];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/tasks/${taskId}/chat/messages?limit=30&beforeCursor=${cursor}`);

      const fetchedOlder = response.data.data;
      const currentList = get().messagesByTask[taskId] || [];

      // Deduplicate
      const existingIds = new Set(currentList.map((m) => m.id));
      const uniqueOlder = fetchedOlder.filter((m) => !existingIds.has(m.id));

      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: [...uniqueOlder, ...currentList],
        },
        nextCursorByTask: {
          ...state.nextCursorByTask,
          [taskId]: response.data.nextCursor,
        },
        hasMoreByTask: {
          ...state.hasMoreByTask,
          [taskId]: response.data.hasMore,
        },
        isLoadingMoreByTask: { ...state.isLoadingMoreByTask, [taskId]: false },
      }));

      return uniqueOlder.length;
    } catch (err) {
      set((state) => ({
        isLoadingMoreByTask: { ...state.isLoadingMoreByTask, [taskId]: false },
      }));
      return 0;
    }
  },

  fetchMessagesAround: async (taskId, timestamp) => {
    set((state) => ({
      isLoadingByTask: { ...state.isLoadingByTask, [taskId]: true },
    }));

    try {
      const response = await api.get<{
        success: true;
        data: TaskChatMessage[];
      }>(`/tasks/${taskId}/chat/messages/around?timestamp=${encodeURIComponent(timestamp)}&limit=30`);

      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: response.data.data,
        },
        isLoadingByTask: { ...state.isLoadingByTask, [taskId]: false },
      }));
    } catch (err: any) {
      set((state) => ({
        isLoadingByTask: { ...state.isLoadingByTask, [taskId]: false },
      }));
    }
  },

  searchMessages: async (taskId, query) => {
    if (!query || !query.trim()) {
      set({ searchResults: [], searchQuery: '', isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query.trim() });
    try {
      const response = await api.get<{ success: true; data: TaskChatMessage[] }>(
        `/tasks/${taskId}/chat/messages/search?q=${encodeURIComponent(query.trim())}`
      );
      set({ searchResults: response.data.data, isSearching: false });
    } catch (err) {
      set({ searchResults: [], isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '', isSearching: false });
  },

  sendMessage: async (taskId, body, currentUser) => {
    const tempId = `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const tempMessage: TaskChatMessage = {
      id: tempId,
      taskId,
      userId: currentUser.id,
      user: currentUser,
      body: body.trim(),
      status: 'sending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically insert into state
    set((state) => {
      const currentList = state.messagesByTask[taskId] || [];
      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: [...currentList, tempMessage],
        },
      };
    });

    try {
      const response = await api.post<{ success: true; data: TaskChatMessage }>(
        `/tasks/${taskId}/chat/messages`,
        { body: body.trim() }
      );

      const created = response.data.data;
      created.status = 'sent';

      // Replace temp message with server response
      set((state) => {
        const currentList = state.messagesByTask[taskId] || [];
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: currentList.map((m) => (m.id === tempId ? created : m)),
          },
        };
      });
    } catch (err: any) {
      // Mark temp message as failed
      set((state) => {
        const currentList = state.messagesByTask[taskId] || [];
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: currentList.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
          },
        };
      });
    }
  },

  retrySendMessage: async (taskId, tempId) => {
    const currentList = get().messagesByTask[taskId] || [];
    const failedMsg = currentList.find((m) => m.id === tempId);
    if (!failedMsg) return;

    // Change status back to sending
    set((state) => ({
      messagesByTask: {
        ...state.messagesByTask,
        [taskId]: currentList.map((m) => (m.id === tempId ? { ...m, status: 'sending' } : m)),
      },
    }));

    try {
      const response = await api.post<{ success: true; data: TaskChatMessage }>(
        `/tasks/${taskId}/chat/messages`,
        { body: failedMsg.body }
      );

      const created = response.data.data;
      created.status = 'sent';

      set((state) => {
        const list = state.messagesByTask[taskId] || [];
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: list.map((m) => (m.id === tempId ? created : m)),
          },
        };
      });
    } catch (err) {
      set((state) => {
        const list = state.messagesByTask[taskId] || [];
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: list.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
          },
        };
      });
    }
  },

  editMessage: async (taskId, messageId, body) => {
    try {
      const response = await api.put<{ success: true; data: TaskChatMessage }>(
        `/chat/messages/${messageId}`,
        { body: body.trim() }
      );

      const updated = response.data.data;
      get().addOrUpdateRealtimeMessage(taskId, updated);
    } catch (err: any) {
      throw err;
    }
  },

  deleteMessage: async (taskId, messageId) => {
    try {
      const response = await api.delete<{ success: true; data: TaskChatMessage }>(
        `/chat/messages/${messageId}`
      );
      const updated = response.data.data;
      get().addOrUpdateRealtimeMessage(taskId, updated);
    } catch (err: any) {
      throw err;
    }
  },

  addOrUpdateRealtimeMessage: (taskId, message) => {
    set((state) => {
      const currentList = state.messagesByTask[taskId] || [];

      // Check if message already exists by ID
      const index = currentList.findIndex((m) => m.id === message.id);
      if (index !== -1) {
        const updatedList = [...currentList];
        updatedList[index] = message;
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: updatedList,
          },
        };
      }

      // Append new message and sort by createdAt
      const newList = [...currentList, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: newList,
        },
      };
    });
  },

  setTypingUser: (taskId, userId, name) => {
    set((state) => {
      const taskTyping = state.typingUsersByTask[taskId] || {};
      return {
        typingUsersByTask: {
          ...state.typingUsersByTask,
          [taskId]: { ...taskTyping, [userId]: name },
        },
      };
    });
  },

  removeTypingUser: (taskId, userId) => {
    set((state) => {
      const taskTyping = { ...(state.typingUsersByTask[taskId] || {}) };
      delete taskTyping[userId];
      return {
        typingUsersByTask: {
          ...state.typingUsersByTask,
          [taskId]: taskTyping,
        },
      };
    });
  },
}));

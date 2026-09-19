import { useEffect, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import { useChatStore } from '../stores/chatStore';
import { useNotificationStore } from '../stores/notificationStore';

let socket: Socket | null = null;

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!user || !accessToken) {
      disconnectSocket();
      return;
    }

    connectSocket(user.id, accessToken);

    return () => {
      disconnectSocket();
    };
  }, [user, accessToken]);

  const connectSocket = useCallback((userId: string, token: string) => {
    if (socket?.connected) return;

    socket = io(ENV.SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      socket?.emit('joinUser', { userId });
    });

    socket.on('task:updated', (task: any) => {
      const boardStore = useBoardStore.getState();
      boardStore.updateTask(task.id, task);
    });

    socket.on('task:moved', (task: any) => {
      const boardStore = useBoardStore.getState();
      const columns = boardStore.columns;
      const targetCol = columns.find((c) => c.id === task.columnId);
      if (targetCol) {
        boardStore.moveTask(task.id, task.columnId, task.position, task.version);
      }
    });

    socket.on('task:deleted', (data: { id: string }) => {
      const boardStore = useBoardStore.getState();
      boardStore.deleteTask(data.id);
    });

    socket.on('chat:message', (message: any) => {
      useChatStore.getState().addMessage(message);
    });

    socket.on('chat:typing', (data: { taskId: string; userId: string; name: string }) => {
      useChatStore.getState().setTyping(data.taskId, data.userId, data.name);
    });

    socket.on('chat:typing:stop', (data: { taskId: string; userId: string }) => {
      useChatStore.getState().removeTyping(data.taskId, data.userId);
    });

    socket.on('notification:new', (notification: any) => {
      Vibration.vibrate([0, 200, 100, 200]);
      useNotificationStore.getState().addNotification(notification);
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
    });
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, []);

  const joinBoard = useCallback((boardId: string) => {
    socket?.emit('joinBoard', { boardId });
  }, []);

  const leaveBoard = useCallback((boardId: string) => {
    socket?.emit('leaveBoard', { boardId });
  }, []);

  const emitTyping = useCallback((boardId: string, taskId: string, name: string) => {
    socket?.emit('typing', { boardId, taskId, name });
  }, []);

  const emitStopTyping = useCallback((boardId: string, taskId: string) => {
    socket?.emit('stopTyping', { boardId, taskId });
  }, []);

  return {
    socket,
    joinBoard,
    leaveBoard,
    emitTyping,
    emitStopTyping,
    disconnectSocket,
  };
}

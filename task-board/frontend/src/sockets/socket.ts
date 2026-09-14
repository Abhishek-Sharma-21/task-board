import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const socketUrl = env.apiBaseUrl.replace(/\/api$/, '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const authHeader = token ? `Bearer ${token}` : '';

  if (!socket) {
    socket = io(socketUrl, {
      auth: {
        token: authHeader,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
      const freshToken = localStorage.getItem('accessToken');
      if (freshToken && socket) {
        socket.auth = { token: `Bearer ${freshToken}` };
      }
    });
  } else {
    socket.auth = { token: authHeader };
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  s.auth = { token: token ? `Bearer ${token}` : '' };

  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

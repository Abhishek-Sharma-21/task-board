import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = env.apiBaseUrl.replace(/\/api$/, '');
    const token = localStorage.getItem('accessToken');
    socket = io(socketUrl, {
      auth: {
        token: token ? `Bearer ${token}` : '',
      },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

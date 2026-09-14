import { io, Socket } from 'socket.io-client';
import { storage } from './storage';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = API_BASE_URL.replace(/\/api$/, '');
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect_error', async (err) => {
      console.warn('[mobile-socket] Connection error:', err.message);
      const token = await storage.getToken();
      if (token && socket) {
        socket.auth = { token: `Bearer ${token}` };
      }
    });
  }
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  const s = getSocket();
  const token = await storage.getToken();
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

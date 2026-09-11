import { create } from 'zustand';
import { isAxiosError, type AxiosError } from 'axios';
import { api } from '../../api/client';
import type { User } from '../../schemas';

interface AuthResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

function isAuthError(
  err: unknown,
): err is AxiosError<{ errorCode?: string; message?: string }> {
  return isAxiosError(err);
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setIsLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ success: true; data: AuthResponseData }>(
        '/auth/login',
        { email, password },
      );
      const { user, accessToken, refreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ success: true; data: AuthResponseData }>(
        '/auth/register',
        { name, email, password },
      );
      const { user, accessToken, refreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (!isAuthError(error) || error.response?.status !== 401) {
        // ignore 401 (already logged out) but surface other logout failures
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, accessToken: null, isLoading: false });
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isInitialized: true });
      return;
    }
    set({ accessToken: token, isLoading: true });
    try {
      const response = await api.get<{ success: true; data: { user: User } }>('/auth/me');
      set({
        user: response.data.data.user,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      localStorage.removeItem('accessToken');
      set({
        accessToken: null,
        user: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },
}));
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  isLoading: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const { data } = await api.get('/auth/me');
        set({ user: data.data, accessToken: token, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      await AsyncStorage.removeItem('accessToken');
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken } = data.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      const { user, accessToken } = data.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await AsyncStorage.removeItem('accessToken');
    set({ user: null, accessToken: null });
  },

  setUser: (user: User) => set({ user }),
}));

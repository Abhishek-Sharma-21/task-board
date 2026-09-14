import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import { storage } from './storage';

const HOST_LAN_IP = '10.146.79.18';

/**
 * Resolves the backend base API URL dynamically.
 * Priority:
 * 1. process.env.EXPO_PUBLIC_API_URL (if provided)
 * 2. Web location hostname (if running in browser)
 * 3. Expo Metro scriptURL host IP (if running on physical mobile / emulator over LAN)
 * 4. Host LAN IP fallback (10.146.79.18:4000/api)
 */
const resolveApiBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL;

  if (url && url.trim()) {
    url = url.trim().replace(/\/+$/, '');
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:4000/api`;
  }

  // Extract host IP from React Native Metro bundler URL (e.g. http://192.168.x.x:8081)
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const address = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
    if (address && address !== 'localhost' && address !== '127.0.0.1' && address !== '::1') {
      return `http://${address}:4000/api`;
    }
  }

  // Fallback to host LAN IP so physical devices over Expo Go / Wi-Fi reach dev PC
  return `http://${HOST_LAN_IP}:4000/api`;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const BACKEND_HOST = API_BASE_URL.replace(/\/api$/, '');

console.log(`[mobile-app] API Base URL configured -> ${API_BASE_URL}`);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 12000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.post('/auth/refresh');
        const newToken = refreshRes.data.data.accessToken;
        await storage.setToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        await storage.removeToken();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

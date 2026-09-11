import axios from 'axios';
import { env } from '../config/env';

interface AuthResponseData {
  user: { id: string; name: string; email: string };
  accessToken: string;
}

// Create an axios instance with base URL and credentials
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // Important for sending cookies (refresh token, csrf token)
});

// Request interceptor to add access token and CSRF token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Extract CSRF token from cookies
    if (typeof document !== 'undefined') {
      const csrfCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('tb_csrf='));
      if (csrfCookie) {
        const csrfToken = csrfCookie.split('=')[1];
        config.headers = config.headers ?? {};
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/register') ||
                           originalRequest.url?.includes('/auth/refresh');

    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const response = await api.post<{ success: true; data: AuthResponseData }>('/auth/refresh');
        const { accessToken } = response.data.data;

        // Store the new access token
        localStorage.setItem('accessToken', accessToken);

        // Update the authorization header for the original request
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process the queue
        processQueue(null, accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
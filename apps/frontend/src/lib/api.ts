import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const FILE_SERVER_URL =
  process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';

export function fileUrl(key: string): string {
  return `${FILE_SERVER_URL}/api/v1/files/${key}`;
}

/**
 * Refresh the access token using the stored refresh token, updating
 * localStorage + cookies. Returns the new access token, or null when there's no
 * refresh token or the refresh fails. Used by raw-XHR callers (file uploads)
 * that bypass the `apiClient` response interceptor and so don't auto-refresh.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('rmc_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    const { accessToken, refreshToken: newRefresh } = res.data.data;
    localStorage.setItem('rmc_access_token', accessToken);
    localStorage.setItem('rmc_refresh_token', newRefresh);
    if (typeof document !== 'undefined') {
      document.cookie = `rmc_access_token=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
      document.cookie = `rmc_refresh_token=${newRefresh}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    }
    return accessToken;
  } catch {
    return null;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  timestamp: string;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('rmc_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('rmc_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem('rmc_access_token', accessToken);
        localStorage.setItem('rmc_refresh_token', newRefresh);
        if (typeof document !== 'undefined') {
          document.cookie = `rmc_access_token=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
          document.cookie = `rmc_refresh_token=${newRefresh}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
        }

        onRefreshed(accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        localStorage.removeItem('rmc_access_token');
        localStorage.removeItem('rmc_refresh_token');
        const locale = window.location.pathname.split('/')[1] || 'rw';
        window.location.href = `/${locale}/login`;
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

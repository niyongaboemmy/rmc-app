import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const FILE_SERVER_URL =
  process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';

export function fileUrl(key: string): string {
  return `${FILE_SERVER_URL}/api/v1/files/${key}`;
}

/**
 * Resolve a stored asset reference to a displayable URL.
 *
 * Content can mix two kinds of image references transparently: assets shipped in
 * the app's `/public` folder (e.g. "/partners/adef.png"), absolute URLs and data
 * URIs — all returned as-is — and bare file-server keys from admin uploads (e.g.
 * "partners/uuid.jpg"), which are expanded via {@link fileUrl}. Seed content and
 * uploaded content therefore render through the same `src` with no special-casing
 * at each call site.
 */
export function assetUrl(value: string): string {
  if (!value) return value;
  if (/^(https?:\/\/|\/|data:)/.test(value)) return value;
  return fileUrl(value);
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
  // Never clobber an Authorization a caller set explicitly. The OTP-gated
  // "track your application" calls send a short-lived TRACKING token, not the
  // logged-in user's access token — overwriting it (whenever an admin happens to
  // be logged in on the same browser) makes the backend reject a valid tracking
  // session as expired. Only fall back to the stored token when none was given.
  if (typeof window !== 'undefined' && config.headers && !config.headers.Authorization) {
    const token = localStorage.getItem('rmc_access_token');
    if (token) {
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
    // Public OTP-gated tracking calls carry their own short-lived token, not the
    // admin session — a 401 there means "re-verify", never "refresh the admin
    // token and, failing that, redirect to the admin login". Let the caller
    // handle it so the applicant sees the right message instead of being bounced.
    const isTrackingEndpoint = originalRequest.url?.includes('/applications/track');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint && !isTrackingEndpoint) {
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

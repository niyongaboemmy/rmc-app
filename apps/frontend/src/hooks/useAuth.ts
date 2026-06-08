'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface LoginResult {
  accessToken?: string;
  refreshToken?: string;
  requiresMfa?: boolean;
  user?: AuthUser;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user || (typeof window !== 'undefined' && !!localStorage.getItem('rmc_access_token'));

  const login = useCallback(
    async (identifier: string, password: string, mfaCode?: string): Promise<LoginResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<{ success: boolean; data: LoginResult }>('/auth/login', {
          identifier,
          password,
          ...(mfaCode ? { mfaCode } : {}),
        });

        const data = res.data.data;

        if (data.accessToken) {
          localStorage.setItem('rmc_access_token', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('rmc_refresh_token', data.refreshToken);
        }
        if (data.user) {
          setUser(data.user as AuthUser);
        }

        return data;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        const msg = axiosErr?.response?.data?.error?.message || 'Login failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const refreshToken = localStorage.getItem('rmc_refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // logout best-effort
    } finally {
      localStorage.removeItem('rmc_access_token');
      localStorage.removeItem('rmc_refresh_token');
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return { user, isAuthenticated, isLoading, error, login, logout };
}

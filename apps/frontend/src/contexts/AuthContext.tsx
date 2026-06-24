'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { Permission, hasPermission as checkPermission } from '@/lib/permissions';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId?: string | null;
  permissions: string[];
  status: string;
  profilePhotoUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, mfaCode?: string) => Promise<LoginResult>;
  verify2fa: (tempToken: string, otp: string) => Promise<LoginResult>;
  resend2fa: (tempToken: string) => Promise<{ maskedPhone: string; expiresAt: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  isSuperAdmin: boolean;
}

export interface LoginResult {
  requiresMfa?: boolean;
  requires2fa?: boolean;
  tempToken?: string;
  maskedPhone?: string;
  user?: AuthUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setAuthCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

function clearAuthCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

function parseJwtPayload(token: string): Partial<AuthUser> | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      roleId: decoded.roleId,
      permissions: decoded.permissions ?? [],
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromStorage = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
    if (!token) {
      // If localStorage has no token but cookies may still exist (e.g. storage was
      // cleared externally), clear the cookies so the middleware doesn't redirect
      // the user away from /login when they're effectively logged out.
      clearAuthCookie('rmc_access_token');
      clearAuthCookie('rmc_refresh_token');
      setIsLoading(false);
      return;
    }

    // Fast: parse permissions from JWT immediately (no extra RTT)
    const jwtData = parseJwtPayload(token);
    if (!jwtData) {
      localStorage.removeItem('rmc_access_token');
      localStorage.removeItem('rmc_refresh_token');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch full profile for display data (name, photo, etc.)
      const res = await apiClient.get<{ success: boolean; data: AuthUser }>('/auth/profile');
      setUser({ ...res.data.data, permissions: jwtData.permissions ?? [] });
    } catch {
      // Token may have expired — the axios interceptor will handle refresh
      const stored = localStorage.getItem('rmc_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch { /* ignore */ }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUserFromStorage();
  }, [loadUserFromStorage]);

  // Persist user to localStorage for SSR-hydration consistency
  useEffect(() => {
    if (user) {
      localStorage.setItem('rmc_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rmc_user');
    }
  }, [user]);

  const applyTokens = useCallback((accessToken: string, refreshToken: string, userData: AuthUser): AuthUser => {
    localStorage.setItem('rmc_access_token', accessToken);
    setAuthCookie('rmc_access_token', accessToken, 15 * 60);
    localStorage.setItem('rmc_refresh_token', refreshToken);
    setAuthCookie('rmc_refresh_token', refreshToken, 7 * 24 * 60 * 60);

    const jwtData = parseJwtPayload(accessToken);
    const fullUser: AuthUser = { ...userData, permissions: jwtData?.permissions ?? [] };
    setUser(fullUser);
    return fullUser;
  }, []);

  const login = useCallback(async (identifier: string, password: string, mfaCode?: string): Promise<LoginResult> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        accessToken?: string;
        refreshToken?: string;
        requiresMfa?: boolean;
        requires2fa?: boolean;
        tempToken?: string;
        maskedPhone?: string;
        user?: AuthUser;
      };
    }>('/auth/login', { identifier, password, ...(mfaCode ? { mfaCode } : {}) });

    const data = res.data.data;

    if (data.requiresMfa) return { requiresMfa: true };

    if (data.requires2fa) {
      return { requires2fa: true, tempToken: data.tempToken, maskedPhone: data.maskedPhone };
    }

    if (data.accessToken && data.refreshToken && data.user) {
      const fullUser = applyTokens(data.accessToken, data.refreshToken, data.user);
      return { user: fullUser };
    }

    return {};
  }, [applyTokens]);

  const verify2fa = useCallback(async (tempToken: string, otp: string): Promise<LoginResult> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { accessToken: string; refreshToken: string; user: AuthUser };
    }>('/auth/2fa/verify-login', { tempToken, otp });

    const data = res.data.data;
    const fullUser = applyTokens(data.accessToken, data.refreshToken, data.user);
    return { user: fullUser };
  }, [applyTokens]);

  const resend2fa = useCallback(async (tempToken: string) => {
    const res = await apiClient.post<{
      success: boolean;
      data: { maskedPhone: string; expiresAt: string };
    }>('/auth/2fa/resend', { tempToken });
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('rmc_refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch { /* best-effort */ } finally {
      localStorage.removeItem('rmc_access_token');
      localStorage.removeItem('rmc_refresh_token');
      localStorage.removeItem('rmc_user');
      clearAuthCookie('rmc_access_token');
      clearAuthCookie('rmc_refresh_token');
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('rmc_access_token');
    if (!token) return;
    const jwtData = parseJwtPayload(token);
    try {
      const res = await apiClient.get<{ success: boolean; data: AuthUser }>('/auth/profile');
      setUser({ ...res.data.data, permissions: jwtData?.permissions ?? [] });
    } catch { /* handled by interceptor */ }
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      return checkPermission(user.permissions, permission);
    },
    [user],
  );

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, verify2fa, resend2fa, logout, refreshUser, hasPermission, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

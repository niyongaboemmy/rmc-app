'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, user must have ALL of these permissions */
  permissions?: Permission[];
  /** If provided, user must have at least one of these roles */
  roles?: string[];
  /** Where to redirect unauthenticated users (defaults to /login) */
  redirectTo?: string;
}

export function ProtectedRoute({ children, permissions, roles, redirectTo }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'rw';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/${locale}${redirectTo ?? '/login'}`);
      return;
    }

    if (roles && user && !roles.includes(user.role)) {
      router.replace(`/${locale}`);
      return;
    }

    if (permissions && !permissions.every((p) => hasPermission(p))) {
      router.replace(`/${locale}`);
    }
  }, [isLoading, isAuthenticated, user, roles, permissions, hasPermission, router, locale, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rmc-green" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (roles && user && !roles.includes(user.role)) return null;
  if (permissions && !permissions.every((p) => hasPermission(p))) return null;

  return <>{children}</>;
}

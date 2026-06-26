'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface GuestRouteProps {
  children: React.ReactNode;
  /** Where to send already-authenticated users (defaults to /) */
  redirectTo?: string;
}

/**
 * Wraps public-only pages (login, register).
 * - Shows a centered spinner while the initial auth check runs.
 * - Redirects authenticated users away from the page.
 * - Renders children only when loading is done and the user is not logged in.
 */
export function GuestRoute({ children, redirectTo }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'rw';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(`/${locale}${redirectTo ?? ''}`);
    }
  }, [isLoading, isAuthenticated, router, locale, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-full border-[3px] border-rmc-green/20 border-t-rmc-green animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Checking session…</p>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}

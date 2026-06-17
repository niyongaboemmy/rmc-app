'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Permission, hasAnyPermission } from '@/lib/permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  /** Render children only when the user has ALL of these permissions */
  permissions?: Permission[];
  /** Render children when the user has ANY of these permissions */
  anyOf?: Permission[];
  /** Render children only for these roles */
  roles?: string[];
  /** Fallback UI when access is denied (defaults to null) */
  fallback?: React.ReactNode;
}

export function PermissionGate({ children, permissions, anyOf, roles, fallback = null }: PermissionGateProps) {
  const { user, hasPermission, isSuperAdmin } = useAuth();

  if (!user) return <>{fallback}</>;
  if (isSuperAdmin) return <>{children}</>;

  if (roles && !roles.includes(user.role)) return <>{fallback}</>;
  if (permissions && !permissions.every((p) => hasPermission(p))) return <>{fallback}</>;
  if (anyOf && !hasAnyPermission(user.permissions, anyOf)) return <>{fallback}</>;

  return <>{children}</>;
}

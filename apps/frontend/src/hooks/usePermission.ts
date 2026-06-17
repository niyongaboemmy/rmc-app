import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function usePermissions(permissions: Permission[]): boolean {
  const { hasPermission } = useAuth();
  return permissions.every((p) => hasPermission(p));
}

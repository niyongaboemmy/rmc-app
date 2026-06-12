import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types/permissions.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Alias for more idiomatic usage
export const Permissions = RequirePermissions;

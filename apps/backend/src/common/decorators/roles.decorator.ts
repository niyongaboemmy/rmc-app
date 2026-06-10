import { SetMetadata } from '@nestjs/common';

export enum Role {
  USER = 'user',
  OPERATOR = 'operator',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

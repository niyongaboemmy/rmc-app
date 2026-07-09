import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../types/permissions.enum';
import { ErrorCode } from '../types/error-codes.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { permissions?: string[]; role?: string } }>();

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_INSUFFICIENT_ROLE,
        message: 'Access denied',
      });
    }

    // Superadmin or wildcard permission bypasses all checks
    if (user.role === 'superadmin') return true;

    const userPermissions: string[] = user.permissions ?? [];
    if (userPermissions.includes('*')) return true;

    const hasAll = required.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_INSUFFICIENT_ROLE,
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}

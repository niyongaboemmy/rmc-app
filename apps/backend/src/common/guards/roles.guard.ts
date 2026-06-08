import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorCode } from '../types/error-codes.enum';

const ROLE_LEVELS: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.OPERATOR]: 2,
  [Role.ADMIN]: 3,
  [Role.SUPERADMIN]: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: { role: Role } }>();

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_INSUFFICIENT_ROLE,
        message: 'Access denied: insufficient permissions',
      });
    }

    const userLevel = ROLE_LEVELS[user.role as Role] ?? 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => ROLE_LEVELS[r] ?? 99));

    if (userLevel < requiredLevel) {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_INSUFFICIENT_ROLE,
        message: 'Access denied: insufficient permissions',
      });
    }

    return true;
  }
}

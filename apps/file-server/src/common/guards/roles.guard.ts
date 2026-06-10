import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';
import { JwtUser } from '../decorators/current-user.decorator';
import { Request } from 'express';

const ROLE_LEVELS: Record<string, number> = {
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
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user: JwtUser }>();
    const user = request.user;
    if (!user) return false;

    const userLevel = ROLE_LEVELS[user.role] ?? 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => ROLE_LEVELS[r] ?? 99));

    if (userLevel < requiredLevel) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    return true;
  }
}

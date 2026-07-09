import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ErrorCode } from '../types/error-codes.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }

  handleRequest<TUser = unknown>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid or expired access token',
      });
    }
    return user;
  }
}

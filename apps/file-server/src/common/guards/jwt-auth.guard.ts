import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  // `info` is the third Passport callback argument: JsonWebTokenError,
  // TokenExpiredError, or null/undefined when no token was found at all.
  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const errMsg   = err   ? (err  as Error)?.message ?? String(err)  : null;
      const infoMsg  = info  ? (info as Error)?.message ?? String(info) : null;
      const reason   = errMsg ?? infoMsg ?? 'no token present';
      this.logger.warn(`JWT auth failed — ${reason}`);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token',
      });
    }
    return user;
  }
}

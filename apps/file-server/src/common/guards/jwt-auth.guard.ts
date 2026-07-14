import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Key prefixes whose files are NOT public, even though the file-serving route is.
 *
 * `GET /files/:key` has to stay @Public so gallery images and avatars load in an
 * <img> tag. But some uploads are private documents (Hajj payment receipts, death
 * certificates), and an unguessable UUID is obscurity, not access
 * control. Files under these prefixes require a valid JWT — the backend fetches
 * them with a service token and re-serves them to permitted admins.
 *
 * Override with PROTECTED_KEY_PREFIXES (comma-separated).
 */
const DEFAULT_PROTECTED_PREFIXES = ['hajj-proofs/', 'funeral-docs/'];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly protectedPrefixes: string[];

  constructor(
    private reflector: Reflector,
    config: ConfigService,
  ) {
    super();
    const configured = config.get<string>('PROTECTED_KEY_PREFIXES');
    this.protectedPrefixes = configured
      ? configured.split(',').map((p) => p.trim()).filter(Boolean)
      : DEFAULT_PROTECTED_PREFIXES;
  }

  /** True when the request targets a file under a protected prefix. */
  private isProtectedKey(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = decodeURIComponent(req.params?.key ?? '');
    if (!key) return false;
    return this.protectedPrefixes.some((prefix) => key.startsWith(prefix));
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // A public route still requires a token when the key is a private document.
    if (isPublic && !this.isProtectedKey(context)) return true;
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

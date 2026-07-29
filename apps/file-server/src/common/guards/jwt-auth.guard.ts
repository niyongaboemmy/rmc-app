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
 * certificates, library books), and an unguessable UUID is obscurity, not access
 * control. Files under these prefixes require a valid JWT — the backend fetches
 * them with a service token and re-serves them to permitted admins.
 *
 * ⛔ PROTECTED_KEY_PREFIXES OVERRIDES THIS LIST — IT DOES NOT APPEND TO IT.
 *
 * See resolveProtectedPrefixes() below: a configured value REPLACES these
 * defaults wholesale. Setting `PROTECTED_KEY_PREFIXES=dawah-library/` in order
 * to "add" the library would therefore un-protect hajj-proofs/ and
 * funeral-docs/ — every payment receipt and death certificate in the system
 * would become publicly downloadable by raw URL, and nothing would look broken.
 * There is no error, no failed request, no alert. It would simply be a breach.
 *
 * So: add new prefixes HERE, in code, and leave the env var unset. Any
 * deployment that does set it MUST enumerate ALL prefixes, not just the one it
 * cares about. main.ts asserts this at boot and logs loudly if one is missing.
 */
export const DEFAULT_PROTECTED_PREFIXES = [
  'hajj-proofs/',
  'funeral-docs/',
  // Library books. The plan's §6 design turns on this line: because the bytes
  // are unreachable without a JWT, the ONLY way to read a book is through the
  // backend — which is exactly where the visibility / allow_download policy
  // lives. Remove this and the policy becomes decorative.
  'dawah-library/',
  // Tender bid attachments: company registration, RRA tax clearance and the
  // technical/financial proposal. A competitor who learns a key must not be
  // able to read a rival's pricing, so these are fetched only by the backend —
  // which re-serves them to permitted admins and to the bidder's own verified
  // OTP tracking session.
  'tender-applications/',
];

/**
 * The single source of truth for the active prefix list. The guard uses it to
 * decide what to protect, and main.ts uses it to assert that what got protected
 * is what we expected — both reading the SAME resolution, so the assertion
 * cannot drift from the behaviour it is checking.
 */
export function resolveProtectedPrefixes(config: ConfigService): string[] {
  const configured = config.get<string>('PROTECTED_KEY_PREFIXES');
  return configured
    ? configured.split(',').map((p) => p.trim()).filter(Boolean)
    : DEFAULT_PROTECTED_PREFIXES;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly protectedPrefixes: string[];

  constructor(
    private reflector: Reflector,
    config: ConfigService,
  ) {
    super();
    this.protectedPrefixes = resolveProtectedPrefixes(config);
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

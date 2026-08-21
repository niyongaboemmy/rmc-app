import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * Resolves the OPTIONAL identity of a caller on a @Public() route.
 *
 * Why this exists: the library's preview/download routes are @Public(), so the
 * global JwtAuthGuard short-circuits and never populates `req.user` — even when
 * the caller did send a perfectly good token. But the policy those routes
 * enforce is "a members-only book is readable IF you are signed in", which is a
 * question about identity. The route must therefore be reachable without a
 * token AND able to see one when it is offered. Nest's guard is binary; this is
 * the missing third state.
 *
 * There is no precedent for optional auth in this codebase — every other route
 * is either fully public or fully guarded — so the approach is spelled out:
 *
 *   - No Authorization header            → anonymous. Not an error.
 *   - A token that fails to verify       → anonymous. Deliberately NOT a 401:
 *     an expired token on a public book must still show the book, exactly as if
 *     the reader had never signed in. Rejecting it would make the PUBLIC route
 *     stricter than the anonymous one, which is backwards.
 *   - A token that verifies              → authenticated, `sub` is the user id.
 *
 * The token is only verified, never used to authorise anything beyond "is this
 * a real, unexpired token from us". The permission checks that matter still
 * happen on the admin routes, behind the real guard.
 */
@Injectable()
export class OptionalCallerService {
  private readonly logger = new Logger(OptionalCallerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  /** The caller's user id, or null when the request is anonymous. */
  resolveUserId(req: Request): string | null {
    const header = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) return null;

    const token = header.slice('Bearer '.length).trim();
    if (!token) return null;

    try {
      const payload = this.jwt.verify<{ sub?: string }>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      return payload?.sub ?? null;
    } catch {
      // Expired or malformed. Treat as anonymous — see the class comment.
      this.logger.debug(
        'Optional auth: bearer token present but not valid — treating as anonymous',
      );
      return null;
    }
  }

  isAuthenticated(req: Request): boolean {
    return this.resolveUserId(req) !== null;
  }
}

import type { AuthUser } from '@/contexts/AuthContext';

// Staff roles whose home is the admin dashboard (mirrors the role gate on
// app/[locale]/admin/page.tsx). The member role's slug is `user`; it lands on
// the member dashboard instead. Any other role (e.g. section officers) has no
// dedicated dashboard, so it falls back to the public home page.
const ADMIN_DASHBOARD_ROLES = ['operator', 'admin', 'superadmin', 'marriage_officer'];
const MEMBER_ROLE = 'user';

// Matches a locale-prefixed auth-only page, e.g. `/en/login`, `/rw/register`.
const AUTH_ONLY_PATH = /^\/(en|rw|ar)\/(login|register|forgot-password)(\/|\?|#|$)/;

/**
 * Validate a post-login redirect target so it can't be used for an open
 * redirect. Only a same-origin, root-relative path is allowed — never a
 * protocol-relative `//host`, a `/\host` variant, or an absolute URL — and
 * never an auth-only page, which would bounce the user straight back to login.
 * Returns the safe path, or null if the input can't be trusted.
 */
export function sanitizeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null; // malformed percent-encoding
  }

  if (value[0] !== '/') return null; // must be root-relative
  if (value[1] === '/' || value[1] === '\\') return null; // block //host and /\host
  if (value.includes('\\')) return null; // block backslash escaping tricks
  if (AUTH_ONLY_PATH.test(value)) return null; // don't loop back into auth pages

  return value;
}

/**
 * The dashboard a user should land on when there is no explicit redirect
 * target. Admin/staff → admin dashboard; members → member dashboard;
 * everyone else → locale home.
 */
export function getDashboardPath(user: Pick<AuthUser, 'role'> | null, locale: string): string {
  if (user && ADMIN_DASHBOARD_ROLES.includes(user.role)) return `/${locale}/admin`;
  if (user && user.role === MEMBER_ROLE) return `/${locale}/member/dashboard`;
  return `/${locale}`;
}

/**
 * Resolve where to send a user after a successful login: the page they were
 * trying to reach (if any and trustworthy), otherwise their dashboard.
 */
export function resolvePostLoginPath(
  user: Pick<AuthUser, 'role'> | null,
  redirect: string | null | undefined,
  locale: string,
): string {
  return sanitizeRedirect(redirect) ?? getDashboardPath(user, locale);
}

/**
 * Read the `redirect` query param from the current URL. Client-side only —
 * returns null during SSR. Reading `window.location` here (rather than
 * `useSearchParams`) keeps the auth pages off the forced-Suspense path.
 */
export function getRedirectParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('redirect');
}

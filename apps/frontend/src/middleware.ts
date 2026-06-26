import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['rw', 'en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  // First visits always land on English, ignoring the browser's
  // Accept-Language header. Users can still switch via the language switcher.
  localeDetection: false,
});

// Paths that require authentication (locale-agnostic, checked after stripping locale prefix)
const AUTH_REQUIRED_PATTERNS = [
  /^\/admin(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/member\/dashboard(\/.*)?$/,
];

// Paths only accessible to unauthenticated users
const GUEST_ONLY_PATTERNS = [
  /^\/login$/,
  /^\/register$/,
  /^\/forgot-password$/,
];

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Strip locale prefix to get the route path
  const localeMatch = pathname.match(/^\/(en|rw|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] ?? 'en';
  const routePath = localeMatch?.[2] ?? '/';

  // Check auth tokens from cookies (set by the API client after login).
  //
  // The access token (JWT) is short-lived (15 min). Once it expires the browser
  // drops its cookie, but the session is still valid as long as the refresh
  // token (7 days) is present — the client-side axios interceptor transparently
  // mints a new access token on the next API call. So we must NOT redirect a
  // user to /login just because their access token expired mid-session; treat
  // them as logged in if EITHER the access token is still valid OR a refresh
  // token cookie exists. (The refresh token is an opaque UUID, not a JWT, so we
  // can only check for its presence; its own cookie max-age enforces expiry,
  // and the backend JWT guards still protect the actual data.)
  const accessToken = req.cookies.get('rmc_access_token')?.value;
  const refreshToken = req.cookies.get('rmc_refresh_token')?.value;
  const isLoggedIn =
    (accessToken ? isTokenValid(accessToken) : false) || Boolean(refreshToken);

  // Redirect authenticated users away from guest-only pages.
  // Use a stricter check here: only redirect if the access token is confirmed
  // valid. A stale refresh token cookie (e.g. after localStorage was cleared)
  // must not lock users out of /login — the refresh token's job is to mint a
  // new access token, not to prove the session is still active.
  const hasValidAccessToken = accessToken ? isTokenValid(accessToken) : false;
  if (hasValidAccessToken && GUEST_ONLY_PATTERNS.some((p) => p.test(routePath))) {
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  // Redirect unauthenticated users away from protected pages
  if (!isLoggedIn && AUTH_REQUIRED_PATTERNS.some((p) => p.test(routePath))) {
    const url = new URL(`/${locale}/login`, req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

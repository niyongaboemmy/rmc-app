import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'rw', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
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

  // Check auth token from cookies (set by the API client after login)
  const token = req.cookies.get('rmc_access_token')?.value;
  const isLoggedIn = token ? isTokenValid(token) : false;

  // Redirect authenticated users away from guest-only pages
  if (isLoggedIn && GUEST_ONLY_PATTERNS.some((p) => p.test(routePath))) {
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

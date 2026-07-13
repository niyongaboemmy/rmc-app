/**
 * Barrel for the site-content store.
 *
 * The landing page renders entirely from content managed in Admin → Content.
 * Each section's schema + seed lives in its own module under `./content/*`;
 * the generic client (read/write/locale helpers) lives in `./content/client`.
 *
 * Import everything from `@/lib/content-api`.
 */
export * from './content/client';
export * from './content/who-we-are';
export * from './content/areas';
export * from './content/stats';
export * from './content/partners';
export * from './content/updates';
export * from './content/activities';
export * from './content/announcements';
export * from './content/social';
export * from './content/hero';
export * from './content/blog';
export * from './content/how-to-become-muslim';
export * from './content/contact';
export * from './content/hajj';

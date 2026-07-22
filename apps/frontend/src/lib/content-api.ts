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
// NOTE: `./content/preview-store` is intentionally NOT re-exported here. It is a
// React/JSX module, and this barrel is also imported by the NestJS backend seed
// scripts (apps/backend/src/database/seeds/*) to reuse content keys/defaults —
// pulling JSX into that Node compile breaks it. Import preview-store directly
// from '@/lib/content/preview-store' in frontend code instead.
export * from './content/who-we-are';
export * from './content/areas';
export * from './content/stats';
export * from './content/partners';
export * from './content/updates';
export * from './content/activities';
export * from './content/projects';
export * from './content/announcements';
export * from './content/social';
export * from './content/hero';
export * from './content/blog';
export * from './content/how-to-become-muslim';
export * from './content/contact';
export * from './content/hajj';
export * from './content/funeral';
export * from './content/dawah';

import axios from 'axios';
import { apiClient } from '../api';

/**
 * Client + helpers for the generic site-content store (backend `ContentModule`).
 *
 *  - Reads are PUBLIC (no auth) — used by landing-page components.
 *  - Writes go through the authenticated `apiClient` — used by admin editors.
 *
 * Each landing section is keyed by a stable `sectionKey` (see `ContentKeys`).
 * The stored value is a JSON blob whose shape is owned by the section module
 * (e.g. `content/areas.ts`). Text that must appear in all three languages is
 * modelled as a `Tri` ({ en, rw, ar }); `pick()` selects the active locale and
 * falls back to English when a translation is still empty.
 */

const publicHttp = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  // Bound reads so a slow/unreachable backend fails fast to the section's
  // built-in defaults instead of hanging server-rendered pages.
  timeout: 8000,
});

/** Public read of a section's content. Returns null when the section is unset. */
export async function getSiteContent<T>(key: string): Promise<T | null> {
  const res = await publicHttp.get<{ data: T | null }>(`/content/${key}`);
  return res.data.data;
}

/** Admin upsert of a section's content. Requires an authenticated admin. */
export async function saveSiteContent<T>(key: string, value: T): Promise<T> {
  const res = await apiClient.put<{ data: T }>(`/content/${key}`, { value });
  return res.data.data;
}

// ─── Stable section keys (match the admin/content route folders) ────────────────
export const ContentKeys = {
  whoWeAre: 'who-we-are',
  areas: 'areas',
  stats: 'community-impact',
  partners: 'partners',
  activities: 'activities-events',
  projects: 'projects',
  updates: 'updates-programs',
  announcements: 'announcements',
  social: 'social-media',
  hero: 'hero',
  blog: 'blog',
  howToBecomeMuslim: 'how-to-become-muslim',
  about: 'about',
  contact: 'contact',
  funeral: 'funeral',
  hajj: 'hajj',
  dawah: 'dawah',
  library: 'library',
  courses: 'courses',
  discussions: 'discussions',
  services: 'services',
  historyHeader: 'about-history',
  galleryHero: 'gallery-hero',
  tendersHero: 'tenders-hero',
  registerHero: 'register-hero',
  newMuslimHero: 'new-muslim-hero',
  newMuslim: 'new-muslim',
  servicesHero: 'services-hero',
  contactHero: 'contact-hero',
  tendersHome: 'tenders-home',
  // The three service BOARD pages. Distinct from `tendersHome`, which is the home
  // page's tender teaser — the names are close enough that conflating them is easy.
  tenderService: 'tender-service',
  jobsService: 'jobs-service',
  scholarshipService: 'scholarship-service',
} as const;

// ─── Tri-lingual text helpers ───────────────────────────────────────────────────
export type Locale = 'en' | 'rw' | 'ar';

/** A piece of text in the three supported languages. */
export interface Tri {
  en: string;
  rw: string;
  ar: string;
}

/** Build a Tri; rw/ar default to '' (the UI falls back to English until filled). */
export function tri(en: string, rw = '', ar = ''): Tri {
  return { en, rw, ar };
}

/** Select the active-locale string from a Tri, falling back to English. */
export function pick(t: Tri | undefined | null, locale: string): string {
  if (!t) return '';
  const v = locale === 'rw' ? t.rw : locale === 'ar' ? t.ar : t.en;
  return v && v.trim() ? v : t.en;
}

/**
 * This locale's OWN text from a Tri — no English fallback.
 *
 * The counterpart to `pick()`: use it for anything that must distinguish "there is
 * no copy in this locale" from "the copy happens to be the English one". That is
 * what an edit box needs (see `InlineText`'s `editValue`), because rendering the
 * fallback there makes an untranslated field look finished, leaving nobody able to
 * tell what still needs translating.
 */
export function raw(t: Tri | undefined | null, locale: string): string {
  if (!t) return '';
  return (locale === 'rw' ? t.rw : locale === 'ar' ? t.ar : t.en) ?? '';
}

/** True when the active locale should render right-to-left. */
export function isRtl(locale: string): boolean {
  return locale === 'ar';
}

/**
 * Select a `${base}{En|Rw|Ar}` variant from a flat object (legacy shape used by
 * the Who We Are section), falling back to English.
 */
export function pickLang(content: { [k: string]: unknown }, base: string, locale: string): string {
  const suffix = locale === 'rw' ? 'Rw' : locale === 'ar' ? 'Ar' : 'En';
  const value = content[`${base}${suffix}`];
  if (typeof value === 'string' && value.trim()) return value;
  const en = content[`${base}En`];
  return typeof en === 'string' ? en : '';
}

/** `pickLang`'s counterpart: this locale's own `${base}{En|Rw|Ar}` value, no fallback. */
export function rawLang(content: { [k: string]: unknown }, base: string, locale: string): string {
  const suffix = locale === 'rw' ? 'Rw' : locale === 'ar' ? 'Ar' : 'En';
  const value = content[`${base}${suffix}`];
  return typeof value === 'string' ? value : '';
}

/**
 * Deep-merge saved backend content over the translated defaults.
 *
 * A shallow `{ ...DEFAULT, ...data }` would let a section that only stores part of
 * its shape blank out the rest, so this walks both values: a key the saved blob
 * does NOT carry takes the default, and a key it DOES carry wins outright. Arrays
 * merge element-wise by index so per-item `Tri` translations survive.
 *
 * "Wins outright" includes the empty string, and that is deliberate. An empty
 * translation is how an admin says "this locale has no copy of its own" — `pick()`
 * then falls back to English at render time. This used to substitute the default's
 * translation instead, which meant clearing e.g. the Kinyarwanda headline wrote ""
 * to the store and then rendered the seeded Kinyarwanda copy anyway, so the edit
 * looked like it had been ignored. Backend migration 059 strips the empty
 * translations older admin editors wrote as placeholders, so the sections relying
 * on the old behaviour keep falling back to their seeded copy.
 */
export function mergeContent<T>(defaults: T, data: unknown): T {
  return deepFill(defaults, data) as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function deepFill(def: unknown, data: unknown): unknown {
  if (data === undefined || data === null) return def;
  if (Array.isArray(def) && Array.isArray(data)) {
    return data.map((item, i) => deepFill(i < def.length ? def[i] : item, item));
  }
  if (isPlainObject(def) && isPlainObject(data)) {
    const out: Record<string, unknown> = { ...def };
    for (const key of Object.keys(data)) {
      out[key] = deepFill(def[key], data[key]);
    }
    return out;
  }
  return data;
}

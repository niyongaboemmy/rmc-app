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
  updates: 'updates-programs',
  announcements: 'announcements',
  social: 'social-media',
  hero: 'hero',
  blog: 'blog',
  howToBecomeMuslim: 'how-to-become-muslim',
  about: 'about',
  contact: 'contact',
  hajj: 'hajj',
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

/**
 * Deep-merge saved backend content over the translated defaults.
 *
 * The admin store may hold entries whose translations are still empty (e.g.
 * `{ en: "Apply Now", rw: "", ar: "" }`). A shallow `{ ...DEFAULT, ...data }`
 * lets those blanks overwrite the seeded translations, so translated pages fall
 * back to English. This walks both values and keeps the backend value EXCEPT
 * when it is an empty string, where it falls back to the default's translation.
 * Arrays merge element-wise by index so per-item `Tri` translations survive.
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
  // Primitive: an empty backend string falls back to the default's (translated) value.
  if (typeof data === 'string' && data.trim() === '' && typeof def === 'string' && def.trim() !== '') {
    return def;
  }
  return data;
}

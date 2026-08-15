import { pickLang, rawLang } from '@/lib/content-api';

/**
 * Resolve a tri-lingual sibling-column field from an API row.
 *
 * The Dawah API does NOT return locale-resolved text — it returns the raw
 * columns (`titleEn` / `titleRw` / `titleAr`), because that is how the schema
 * stores them and a single row has to serve all three locales at once. Picking
 * which sibling to show is the client's job.
 *
 * This is field SELECTION, not translation. Course and book titles are content
 * an admin typed, never message-catalogue keys — they must never go through
 * next-intl's `t()`.
 *
 * Falls back to English whenever the requested locale's column is empty, which
 * is the intended state: rw/ar ship as '' and get filled in later, and an
 * English title a reader can act on beats a blank one.
 */
export function localized(row: object, base: string, locale: string): string {
  return pickLang(row as { [k: string]: unknown }, base, locale);
}

/**
 * `localized`'s counterpart: the requested locale's own column, with NO fallback to
 * English. For edit boxes (see `InlineText`'s `editValue`) — showing the English
 * fallback there presents an untranslated record as a finished translation, so the
 * admin cannot see which courses and books still need their rw/ar columns filled.
 */
export function rawLocalized(row: object, base: string, locale: string): string {
  return rawLang(row as { [k: string]: unknown }, base, locale);
}

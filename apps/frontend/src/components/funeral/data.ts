/**
 * Static reference data + helpers for the Funeral Services UI.
 *
 * The domain data (requests, cemeteries, steps) now comes from the backend via
 * `funeralApi`. What remains here is presentational: the hero verse and small
 * percent helpers.
 */

/** A comforting Qur'anic verse shown on the funeral hero. */
export const HERO_AYAH = 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ';

/**
 * Hero backdrop, shared by the funeral landing, request and cemeteries pages —
 * one image per service, as marriage and good conduct already do. A peaceful
 * cemetery at dusk: respectful and calm, never grim.
 */
export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80';

/** Occupancy as a percent (used / capacity), clamped 0–100. */
export function occupancyPercent(used: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((used / capacity) * 100));
}

/** How complete a request is (done steps / total), for the admin table. */
export function requestProgress(r: { timeline: { status: string }[] }): number {
  if (!r.timeline.length) return 0;
  const done = r.timeline.filter((s) => s.status === 'done').length;
  return Math.round((done / r.timeline.length) * 100);
}


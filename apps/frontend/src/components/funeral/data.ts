/**
 * Static reference data + helpers for the Funeral Services UI.
 *
 * The domain data (requests, cemeteries, announcements, volunteers, steps,
 * skills) now comes from the backend via `funeralApi`. What remains here is
 * presentational: the hero verse and small percent helpers.
 */

/** A comforting Qur'anic verse shown on the hero and announcement cards. */
export const HERO_AYAH = 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ';

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


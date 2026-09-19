// Shared gallery types & constants used by the public gallery page.
// The gallery is API-driven (see app/[locale]/gallery/page.tsx) — these are the
// curated category keys used for ordering/labelling and the item shape.

export const CATEGORY_KEYS = [
  'prayer',
  'charity',
  'religious',
  'education',
  'community',
  'mosques',
] as const;

export interface GalleryItem {
  id: string;
  /** Medium (≤900px) file — what tiles and carousel slides show. */
  src: string;
  /** Small (≤400px) file — blurred backdrops and the backs of a pile. */
  thumb: string;
  /** Largest stored file (≤1920px) — the lightbox upgrades to it. */
  full: string;
  categoryKey: string;
  monthKey: string;
}

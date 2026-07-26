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
  src: string;
  categoryKey: string;
  monthKey: string;
}

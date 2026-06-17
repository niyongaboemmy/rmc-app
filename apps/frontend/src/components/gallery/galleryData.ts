// Shared gallery data used by both the gallery index and the per-category pages.
// Swap POOL / the layout logic for real, category-specific photography later.

export type PoolKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export const POOL: Record<PoolKey, string> = {
  a: 'https://drive.google.com/thumbnail?id=1y0QOLz--4XxIthJh7sViyl7KU7XFbd2t&sz=w1600',
  b: 'https://drive.google.com/thumbnail?id=1dNjgzd30RyYQ0_zCLFoqj83HjGh03bwq&sz=w1600',
  c: 'https://drive.google.com/thumbnail?id=1-V1PRFYujv6JHscMzlBlLLayQA9REX7T&sz=w1600',
  d: 'https://lh3.googleusercontent.com/d/1JAOmqaWrQjILrZjGXVt9jP5EpjmR5PNr=w1600?authuser=0',
  e: 'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
  f: 'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
};

export const CATEGORY_KEYS = [
  'prayer',
  'charity',
  'religious',
  'education',
  'community',
  'mosques',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

// Monthly highlight clusters (most recent first). `month` is 0-indexed (JS Date).
export const PERIODS = [
  { key: '2026-06', year: 2026, month: 5 },
  { key: '2026-05', year: 2026, month: 4 },
  { key: '2026-04', year: 2026, month: 3 },
] as const;

export const PER_MONTH = 5;

export interface GalleryItem {
  id: string;
  src: string;
  categoryKey: string;
  monthKey: string;
}

/** Build the full set of gallery items (every category × every month cluster). */
export function buildItems(): GalleryItem[] {
  const poolKeys = Object.keys(POOL) as PoolKey[];
  return CATEGORY_KEYS.flatMap((catKey, cIdx) =>
    PERIODS.flatMap((period, pIdx) =>
      Array.from({ length: PER_MONTH }, (_, k) => {
        const key = poolKeys[(cIdx * 3 + pIdx * 2 + k) % poolKeys.length];
        return {
          id: `${catKey}-${period.key}-${k}`,
          src: POOL[key],
          categoryKey: catKey,
          monthKey: period.key,
        };
      }),
    ),
  );
}

/** Localised month labels for the period clusters. */
export function periodLabels(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  return PERIODS.map((p) => ({ key: p.key, label: fmt.format(new Date(p.year, p.month, 1)) }));
}

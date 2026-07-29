/* ──────────────────────────────────────────────────────────────
   Shared presentation helpers — badges, dates, and money formatting.

   The home "Latest & Upcoming Programs" section and the admin Donate
   dashboard reuse these (e.g. `formatMoney`, `fundedPercent`, `MONTHS`),
   so they live in one place rather than being duplicated per feature.
   ────────────────────────────────────────────────────────────── */

/* Cohesive, on-brand badge family — lean green / gold / neutral,
   no rainbow; every category reads as one system. (rmc-gold-dark
   isn't a token, so gold text uses a token-free value inline.) */
export type BadgeTone = 'green' | 'gold' | 'neutral';

const BADGE_STYLES: Record<BadgeTone, string> = {
  green: 'bg-rmc-green-light text-rmc-green-dark ring-rmc-green/15',
  gold: 'bg-rmc-gold/10 text-[#8A6A0F] ring-rmc-gold/25',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export function badgeClass(tone: BadgeTone) {
  return `inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ${BADGE_STYLES[tone]}`;
}

/** A latest activity, with Tri fields already resolved to plain strings for
 *  the current locale — the shape the gallery lightbox (GalleryModal) renders. */
export interface Activity {
  id: string;
  category: string;
  tone: BadgeTone;
  title: string;
  excerpt: string;
  date: string; // human-readable, e.g. "June 4, 2026"
  image: string; // small thumbnail for the row
  gallery: string[]; // full-size images shown in the lightbox
  peopleHelped: number; // charity impact — beneficiaries reached
  budgetUsed: number; // charity impact — funds spent (RWF)
}

/* ── Date helpers (ISO dates; "upcoming" is measured from the real today) ── */
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d, dateObj: new Date(y, m - 1, d) };
}

export function formatLong(iso: string) {
  return parseISO(iso).dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Local midnight today — the single basis for every past/upcoming check, so
 *  the section always reflects the real current date. */
export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Whole days from today to the given ISO date (negative = already past). */
export function daysFromToday(iso: string): number {
  return Math.round((parseISO(iso).dateObj.getTime() - startOfToday().getTime()) / 86_400_000);
}

/** True when an ISO date (YYYY-MM-DD) is today or still in the future. */
export function isUpcoming(iso: string): boolean {
  return daysFromToday(iso) >= 0;
}

/** Friendly "how soon" label, measured from the real current date. */
export function countdownLabel(iso: string) {
  const days = daysFromToday(iso);
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  if (days < 56) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/* ── Charity / money helpers ── */
export const CURRENCY = 'RWF';

/** Compact money, e.g. 45_000_000 → "45M", 8_500_000 → "8.5M", 850_000 → "850K". */
export function formatMoney(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `${n}`;
}

/** Thousands-separated count, e.g. 7120 → "7,120". */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Funded percentage, clamped to 0–100. */
export function fundedPercent(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

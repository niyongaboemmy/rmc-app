/* ──────────────────────────────────────────────────────────────
   Shared data + helpers for the Activities & Events experience.
   Single source of truth for the home-page preview
   (ActivitiesEventsSection) and the full /activities page.

   Every RMC activity is a charity, so each item carries impact
   figures (people helped, budget used) and every upcoming event is
   a fundraising campaign with a goal (needed) and raised (current).
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
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ${BADGE_STYLES[tone]}`;
}

/* Full-resolution Unsplash URL for the gallery viewer */
const hi = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1280&auto=format&fit=crop`;
const IMG_EDU = 'photo-1541339907198-e08756dedf3f';
const IMG_AID = 'photo-1532629345422-7515f3d16bb6';
const IMG_CONF = 'photo-1521791136064-7986c2920216';

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

export interface RmcEvent {
  id: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD" — drives the tile, ordering and countdown
  time: string;
  location: string;
  type: string;
  tone: BadgeTone;
  goalAmount: number; // fundraising target — money needed (RWF)
  raisedAmount: number; // fundraising progress — money raised so far (RWF)
}

/* ──────────────────────────────────────────────────────────────
   DATA — coherent for TODAY = 12 June 2026
   LATEST   → recent past (mid-Apr → early-Jun 2026)
   UPCOMING → future, chronological (20 Jun → Nov 2026)
   ────────────────────────────────────────────────────────────── */
export const ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    category: 'Education',
    tone: 'green',
    title: 'RMC Launches Digital Madrassa Across All Provinces',
    excerpt:
      'A new online platform for Islamic education is now live nationwide, bringing structured Qur’an and Arabic lessons to over 2,000 children in its first month.',
    date: 'June 4, 2026',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_EDU), hi(IMG_CONF), hi(IMG_AID)],
    peopleHelped: 2000,
    budgetUsed: 18_000_000,
  },
  {
    id: 'a2',
    category: 'Community',
    tone: 'gold',
    title: 'Ramadan Food Distribution Reaches 5,000 Families',
    excerpt:
      'In partnership with local NGOs, RMC delivered food packages to 5,000 vulnerable families across Rwanda throughout the blessed month of Ramadan.',
    date: 'May 12, 2026',
    image:
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_AID), hi(IMG_EDU), hi(IMG_CONF)],
    peopleHelped: 5000,
    budgetUsed: 45_000_000,
  },
  {
    id: 'a3',
    category: 'Leadership',
    tone: 'neutral',
    title: 'Annual Imam Training Conference Held in Musanze',
    excerpt:
      '120 imams from across Rwanda gathered for a three-day programme on community leadership, digital outreach, and pastoral care.',
    date: 'April 18, 2026',
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_CONF), hi(IMG_AID), hi(IMG_EDU)],
    peopleHelped: 120,
    budgetUsed: 8_500_000,
  },
];

export const EVENTS: RmcEvent[] = [
  {
    id: 'e1',
    title: 'Eid al-Adha National Celebration',
    date: '2026-06-20',
    time: '08:00 AM',
    location: 'Amahoro National Stadium, Kigali',
    type: 'Religious',
    tone: 'green',
    goalAmount: 30_000_000,
    raisedAmount: 22_000_000,
  },
  {
    id: 'e2',
    title: 'RMC Annual Scholarship Awards Ceremony',
    date: '2026-07-11',
    time: '10:00 AM',
    location: 'Kigali Convention Centre',
    type: 'Education',
    tone: 'green',
    goalAmount: 50_000_000,
    raisedAmount: 38_000_000,
  },
  {
    id: 'e3',
    title: 'Muslim Women Leadership Summit',
    date: '2026-08-08',
    time: '09:00 AM',
    location: 'Serena Hotel, Kigali',
    type: 'Community',
    tone: 'gold',
    goalAmount: 15_000_000,
    raisedAmount: 9_000_000,
  },
  {
    id: 'e4',
    title: 'Qur’an Recitation Competition — National Finals',
    date: '2026-09-26',
    time: '02:00 PM',
    location: 'Grand Mosque of Kigali',
    type: 'Da’wah',
    tone: 'gold',
    goalAmount: 12_000_000,
    raisedAmount: 7_500_000,
  },
  {
    id: 'e5',
    title: 'RMC General Assembly Meeting',
    date: '2026-11-14',
    time: '09:00 AM',
    location: 'RMC Headquarters, Rebero',
    type: 'Governance',
    tone: 'neutral',
    goalAmount: 8_000_000,
    raisedAmount: 8_000_000,
  },
];

/* ── Date helpers (parsed from ISO; TODAY is 12 June 2026) ── */
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

/* ── Aggregate impact totals (derived once from the data above) ── */
export const IMPACT = {
  peopleHelped: ACTIVITIES.reduce((sum, a) => sum + a.peopleHelped, 0),
  budgetUsed: ACTIVITIES.reduce((sum, a) => sum + a.budgetUsed, 0),
  campaigns: EVENTS.length,
  raised: EVENTS.reduce((sum, e) => sum + e.raisedAmount, 0),
  goal: EVENTS.reduce((sum, e) => sum + e.goalAmount, 0),
};

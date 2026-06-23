/* ──────────────────────────────────────────────────────────────
   Donate-page STRUCTURE (keys, icons, images, amounts).

   All human-readable copy lives in the `donate` namespace of the
   i18n message files (en/rw/ar) and is resolved in the components
   via useTranslations('donate'). This file holds only the stable
   keys, icons, tones, images and numeric config.
   ────────────────────────────────────────────────────────────── */
import {
  GraduationCap,
  HandHeart,
  BookOpen,
  CalendarDays,
  Smartphone,
  CreditCard,
  Landmark,
  Wallet,
} from 'lucide-react';

export type IconType = React.ComponentType<{ className?: string }>;
export type Tone = 'green' | 'gold';

/** Unsplash thumbnail URL (verified IDs only). */
export const uimg = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

/* ── Niyyah (intention) — keys + the Arabic calligraphy (constant across locales) ── */
export interface Niyyah {
  key: string;
  ar: string;
}
export const NIYYAH: Niyyah[] = [
  { key: 'lillah', ar: 'لله' },
  { key: 'sadaqah', ar: 'صدقة جارية' },
  { key: 'zakat', ar: 'زكاة' },
];

/* ── Currencies, presets & approximate Nisab thresholds ── */
export interface CurrencyMeta {
  symbol: string;
  presets: number[];
  nisab: number; // approx. silver Nisab — editable in the Zakat calculator
}
export const CURRENCIES: Record<string, CurrencyMeta> = {
  RWF: { symbol: 'RWF', presets: [5000, 10000, 25000, 50000, 100000], nisab: 700000 },
  USD: { symbol: '$', presets: [10, 25, 50, 100, 250], nisab: 550 },
  EUR: { symbol: '€', presets: [10, 25, 50, 100, 250], nisab: 510 },
  GBP: { symbol: '£', presets: [10, 25, 50, 100, 250], nisab: 430 },
};
export const CURRENCY_KEYS = Object.keys(CURRENCIES);

export function money(currency: string, n: number): string {
  const num = Math.round(n).toLocaleString('en-US');
  return currency === 'RWF' ? `RWF ${num}` : `${CURRENCIES[currency]?.symbol ?? ''}${num}`;
}

/* ── Categories (copy via donate.categories.<key>.*) ── */
export interface DonateCategory {
  key: string;
  Icon: IconType;
  tone: Tone;
  image: string;
}
export const CATEGORIES: DonateCategory[] = [
  { key: 'school', Icon: GraduationCap, tone: 'green', image: uimg('1541339907198-e08756dedf3f') },
  { key: 'charity', Icon: HandHeart, tone: 'green', image: uimg('1532629345422-7515f3d16bb6') },
  { key: 'religious', Icon: BookOpen, tone: 'gold', image: uimg('1542816417-0983c9c9ad53') },
  { key: 'events', Icon: CalendarDays, tone: 'gold', image: uimg('1521791136064-7986c2920216') },
];

/* ── Sub-funds (copy via donate.funds.<category>.<key>.*) ── */
export interface SubFund {
  key: string;
  image: string;
}
export const SUBFUNDS: Record<string, SubFund[]> = {
  school: [
    { key: 'scholarship', image: uimg('1541339907198-e08756dedf3f') },
    { key: 'madrassa', image: uimg('1609599006353-e629aaabfeae') },
    { key: 'teachers', image: uimg('1577896851231-70ef18881754') },
  ],
  charity: [
    { key: 'foodbank', image: uimg('1593113598332-cd288d649433') },
    { key: 'orphans', image: uimg('1488521787991-ed7bbaae773c') },
    { key: 'medical', image: uimg('1576091160550-2173dba999ef') },
  ],
  religious: [
    { key: 'masjid', image: uimg('1542816417-0983c9c9ad53') },
    { key: 'imam', image: uimg('1511632765486-a01980e01a18') },
    { key: 'quran', image: uimg('1609599006353-e629aaabfeae') },
  ],
};

/* ── Per-event imagery (copy via donate.events.<id>.*) ── */
export const EVENT_IMAGE: Record<string, string> = {
  e1: uimg('1542816417-0983c9c9ad53'),
  e2: uimg('1541339907198-e08756dedf3f'),
  e3: uimg('1511632765486-a01980e01a18'),
  e4: uimg('1609599006353-e629aaabfeae'),
  e5: uimg('1521791136064-7986c2920216'),
};

/* ── Payment methods (copy via donate.methods.<key>.*) ── */
export const METHODS: { key: string; Icon: IconType }[] = [
  { key: 'momo', Icon: Smartphone },
  { key: 'card', Icon: CreditCard },
  { key: 'bank', Icon: Landmark },
  { key: 'paypal', Icon: Wallet },
];

/* ── A single line item in the donation cart (stores resolved, localized labels) ── */
export interface CartItem {
  id: string;
  category: string;
  categoryTitle: string; // localized at add-time
  fundKey: string;
  label: string; // localized at add-time
  campaignSlug: string | null;
  amount: number;
}

export const HERO_IMG = uimg('1564769662533-4f00a87b4056', 1600);

/** Tone → icon-chip classes (active vs idle). One green/gold system. */
export function toneChip(tone: Tone, active: boolean): string {
  if (tone === 'gold') {
    return active
      ? 'bg-rmc-gold text-white ring-rmc-gold/30'
      : 'bg-rmc-gold/10 text-[#8A6A0F] ring-rmc-gold/20';
  }
  return active
    ? 'bg-rmc-green text-white ring-rmc-green/30'
    : 'bg-rmc-green-light text-rmc-green ring-rmc-green/10';
}

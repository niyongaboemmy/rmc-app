/* ──────────────────────────────────────────────────────────────
   Donate-page STRUCTURE (keys, icons, images, amounts).

   All human-readable copy lives in the `donate` namespace of the
   i18n message files (en/rw/ar) and is resolved in the components
   via useTranslations('donate'). This file holds only the stable
   keys, icons, tones, images and numeric config.
   ────────────────────────────────────────────────────────────── */
import { Smartphone, CreditCard, Landmark, Wallet } from 'lucide-react';

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

'use client';

/**
 * Compact intention (niyyah) selector — the spiritual heart of giving in Islam,
 * kept as a slim, warm bar beneath the hero rather than a full section. The
 * chosen intention rides along with every donation (see buildDonationMessage).
 */

import { useTranslations } from 'next-intl';
import { NIYYAH } from './donateData';

export function NiyyahBar({
  niyyah,
  onNiyyah,
}: {
  niyyah: string;
  onNiyyah: (key: string) => void;
}) {
  const t = useTranslations('donate');

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-rmc-gold/20 bg-gradient-to-br from-rmc-green-light/40 to-white px-4 py-4 sm:flex-row sm:gap-4">
        <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-rmc-green-dark">
          {t('header.setIntention')}
        </p>
        <div className="grid w-full grid-cols-3 gap-2">
          {NIYYAH.map((n) => {
            const active = niyyah === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => onNiyyah(n.key)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center transition-all duration-200 ${
                  active
                    ? 'border-rmc-green bg-white shadow-sm ring-1 ring-rmc-green/20'
                    : 'border-transparent bg-white/60 hover:bg-white'
                }`}
              >
                <span className={`font-arabic text-base ${active ? 'text-rmc-green' : 'text-rmc-green-dark/70'}`} dir="rtl">
                  {n.ar}
                </span>
                <span className={`text-[13px] font-bold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                  {t(`niyyah.${n.key}.label`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

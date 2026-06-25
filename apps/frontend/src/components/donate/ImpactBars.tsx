'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import { fundedPercent, formatMoney } from './eventsBridge';
import type { PublicCampaign } from '@/lib/donationsApi';

/* Live-impact section: the most under-funded active programs (real campaigns)
   with progress bars that animate (fill) in once on mount. */
export function ImpactBars({ campaigns }: { campaigns: PublicCampaign[] }) {
  const t = useTranslations('donate');
  const [shown, setShown] = useState(false);

  // Reveal once mounted (a frame after first paint, so the bars animate from 0
  // to their real value). Previously gated on an IntersectionObserver, which
  // could leave the bars stuck at 0% if it never fired — making the live
  // percentages look static.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Top 3 still-open programs by funding need (least funded first).
  const top = campaigns
    .map((c) => ({
      id: c.id,
      title: c.title,
      raised: c.receivedAmount,
      goal: c.targetAmount,
      pct: fundedPercent(c.receivedAmount, c.targetAmount),
    }))
    .filter((c) => c.pct < 100)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  if (top.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/15">
          <TrendingUp className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold leading-none text-gray-900">{t('impact.title')}</h2>
          <p className="mt-1 text-[12px] text-gray-400">{t('impact.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-5">
        {top.map(({ id, title, raised, goal, pct }, i) => (
          <div key={id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13.5px] font-semibold text-gray-900">{title}</span>
              <span className="shrink-0 text-[12px] font-bold tabular-nums text-rmc-green">{shown ? pct : 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark transition-[width] duration-[1200ms] ease-out"
                style={{ width: shown ? `${pct}%` : '0%', transitionDelay: `${i * 120}ms` }}
              />
            </div>
            <p className="mt-1 text-[11.5px] tabular-nums text-gray-500">
              {t.rich('impact.raisedOf', {
                raised: formatMoney(raised),
                goal: formatMoney(goal),
                b: (c) => <span className="font-bold text-gray-900">{c}</span>,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

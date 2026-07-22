'use client';

/**
 * A live impact strip that overlaps the hero — turns abstract giving into
 * momentum a donor can see. Every figure is computed from the real campaigns:
 * total raised (in the dominant currency, so currencies are never mixed), total
 * donors, and the number of active causes. Renders nothing until there is data,
 * so an empty page never shows a wall of zeros.
 */

import { HandCoins, Users, HeartHandshake } from 'lucide-react';
import type { PublicCampaign } from '@/lib/donationsApi';
import { money } from './donateData';

export function ImpactStats({ campaigns }: { campaigns: PublicCampaign[] }) {
  if (campaigns.length === 0) return null;

  // Pick the currency the most campaigns use, and sum raised only within it.
  const byCurrency = new Map<string, number>();
  for (const c of campaigns) byCurrency.set(c.currency, (byCurrency.get(c.currency) ?? 0) + 1);
  const mainCurrency = Array.from(byCurrency.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const raised = campaigns
    .filter((c) => c.currency === mainCurrency)
    .reduce((sum, c) => sum + c.receivedAmount, 0);
  const donors = campaigns.reduce((sum, c) => sum + c.donationCount, 0);

  const stats = [
    { icon: HandCoins, value: money(mainCurrency, raised), label: 'Raised so far' },
    { icon: Users, value: donors.toLocaleString('en-US'), label: donors === 1 ? 'Generous donor' : 'Generous donors' },
    { icon: HeartHandshake, value: String(campaigns.length), label: campaigns.length === 1 ? 'Active cause' : 'Active causes' },
  ];

  return (
    <div className="relative z-20 mx-auto -mt-10 max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_40px_-24px_rgba(26,122,74,0.35)]">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-3 py-5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rmc-green/10 text-rmc-green">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-base font-bold leading-tight text-gray-900 tabular-nums sm:text-lg">{value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-[11px]">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

/**
 * Funding progress for an event that is linked to a donation campaign.
 *
 * An event is a calendar entry first — most have no campaign at all — so this
 * renders only when `EventItem.campaignSlug` resolves to a live campaign. The
 * figures come from the campaign record (real donation totals), never from the
 * content store, so what a visitor sees always matches the donate page.
 *
 * `dark` styles it for the featured card's green-deep background.
 */

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { fundedPercent } from '@/components/activities/data';
import { formatCurrency, type PublicCampaign } from '@/lib/donationsApi';
import { pick } from '@/lib/content-api';

export function EventCampaignProgress({
  campaign,
  locale,
  dark = false,
}: {
  campaign: PublicCampaign;
  locale: string;
  dark?: boolean;
}) {
  const pct = fundedPercent(campaign.receivedAmount, campaign.targetAmount);

  const track = dark ? 'bg-white/15' : 'bg-gray-100';
  const fill = dark ? 'bg-rmc-gold-light' : 'bg-rmc-green';
  const amount = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-white/50' : 'text-gray-400';
  const pctColor = dark ? 'text-rmc-gold-light' : 'text-rmc-green';

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className={`font-bold tabular-nums ${amount}`}>
          {formatCurrency(campaign.currency, campaign.receivedAmount)}
          <span className={`font-medium ${muted}`}>
            {' '}/ {formatCurrency(campaign.currency, campaign.targetAmount)}
          </span>
        </span>
        <span className={`font-bold tabular-nums ${pctColor}`}>{pct}%</span>
      </div>

      <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>

      <Link
        href={`/${locale}/donate`}
        onClick={(e) => e.stopPropagation()}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          dark
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-rmc-green-light text-rmc-green-dark hover:bg-rmc-green/15'
        }`}
      >
        <Heart className="h-3 w-3 shrink-0" />
        {pick({ en: 'Donate', rw: 'Tanga', ar: 'تبرع' }, locale)}
      </Link>
    </div>
  );
}

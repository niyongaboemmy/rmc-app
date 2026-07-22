'use client';

/**
 * A single campaign in the donate grid — scannable, not a checkout aisle: cover,
 * title, short summary, live progress, deadline, and two clear actions (Donate →
 * amount modal + cart; Learn more → the campaign's detail page). Uses OUR design
 * system; figures come from the campaign's live `receivedAmount` / target.
 */

import Link from 'next/link';
import { Users, Clock, ArrowRight, HandHeart } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { PublicCampaign } from '@/lib/donationsApi';
import { CampaignProgress } from './CampaignProgress';
import { deadlineLabel } from './campaignMeta';

export function CampaignCard({
  campaign,
  locale,
  onDonate,
}: {
  campaign: PublicCampaign;
  locale: string;
  onDonate: (c: PublicCampaign) => void;
}) {
  const deadline = deadlineLabel(campaign.endDate);
  const href = `/${locale}/donate/${campaign.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-1.5 hover:border-rmc-green/25 hover:shadow-[0_20px_44px_-22px_rgba(26,122,74,0.35)]">
      {/* Cover */}
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-rmc-green-light/40">
        {campaign.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(campaign.heroImageUrl)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white/90">
            <HandHeart className="h-10 w-10" />
          </div>
        )}
        {deadline && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" /> {deadline}
          </span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <Link href={href}>
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green">
            {campaign.title}
          </h3>
        </Link>
        {campaign.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-gray-500">
            {campaign.description}
          </p>
        )}

        {/* Progress pinned to the bottom so every card aligns */}
        <div className="mt-auto pt-4">
          <CampaignProgress
            raised={campaign.receivedAmount}
            target={campaign.targetAmount}
            currency={campaign.currency}
          />

          {campaign.donationCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
              <Users className="h-3 w-3" />
              {campaign.donationCount} donor{campaign.donationCount === 1 ? '' : 's'}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onDonate(campaign)}
              className="flex-1 rounded-full bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              {campaign.ctaText?.trim() || 'Donate'}
            </button>
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              Details <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

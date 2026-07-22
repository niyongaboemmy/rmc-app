'use client';

/**
 * The one campaign given hero treatment on the donate page — a large split card
 * (cover + story + big progress) that focuses attention before the browsable
 * grid. Same live figures + actions as the smaller cards.
 */

import Link from 'next/link';
import { Star, Users, Clock, ArrowRight, HandHeart } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { PublicCampaign } from '@/lib/donationsApi';
import { CampaignProgress } from './CampaignProgress';
import { deadlineLabel } from './campaignMeta';

export function FeaturedCampaign({
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
    <section className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-[0_18px_40px_-24px_rgba(26,122,74,0.3)]">
      <div className="grid md:grid-cols-2">
        {/* Cover */}
        <Link href={href} className="relative block min-h-[240px] overflow-hidden bg-rmc-green-light/40 md:min-h-[360px]">
          {campaign.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(campaign.heroImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white/90">
              <HandHeart className="h-14 w-14" />
            </div>
          )}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-rmc-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rmc-green-deep shadow">
            <Star className="h-3 w-3 fill-current" /> Featured
          </span>
        </Link>

        {/* Content */}
        <div className="flex flex-col justify-center gap-4 p-6 md:p-8 lg:p-10">
          <div>
            <h2 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">{campaign.title}</h2>
            {campaign.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500 md:text-base">
                {campaign.description}
              </p>
            )}
          </div>

          <CampaignProgress
            raised={campaign.receivedAmount}
            target={campaign.targetAmount}
            currency={campaign.currency}
            size="full"
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {campaign.donationCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-rmc-green" /> {campaign.donationCount} donors
              </span>
            )}
            {deadline && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-rmc-gold" /> {deadline}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => onDonate(campaign)}
              className="flex-1 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              {campaign.ctaText?.trim() || 'Donate now'}
            </button>
            <Link
              href={href}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              Learn more <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import { CampaignDetailClient } from '@/components/donate/CampaignDetailClient';

export const metadata: Metadata = {
  title: 'Campaign · Donate — RMC',
};

/**
 * Public campaign detail page (`/donate/[slug]`). Thin server shell; the client
 * component fetches the campaign (+ its updates) and renders the full fundraising
 * landing page, reusing the existing donation cart + payment flow.
 */
export default function CampaignDetailPage({ params }: { params: { slug: string } }) {
  return <CampaignDetailClient slug={params.slug} />;
}

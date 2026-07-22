'use client';

/**
 * Public campaign detail page (`/donate/[slug]`) — a complete fundraising landing
 * page for one campaign: hero, live progress, story, gallery, updates feed, and a
 * sticky donate panel. Donations reuse the exact same cart + CartDrawer payment
 * engine as the main donate page (one cart line per campaign → IntouchPay MoMo).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, Share2, Users, Clock, HeartHandshake, Loader2, ShoppingBag, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { assetUrl } from '@/lib/api';
import { donationsApi, type PublicCampaign, type PublicCampaignDetail } from '@/lib/donationsApi';
import { useDonationCart } from '@/contexts/DonationCartContext';
import { money } from './donateData';
import { CampaignProgress } from './CampaignProgress';
import { deadlineLabel } from './campaignMeta';
import { DonateModal } from './DonateModal';
import { CampaignCard } from './CampaignCard';
import { CartDrawer } from './CartDrawer';
import { SuccessState, type DonationSummary } from './SuccessState';

export function CampaignDetailClient({ slug }: { slug: string }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('donate');
  const { cart, currency, niyyah, total, addItem, removeItem, clear } = useDonationCart();

  const [campaign, setCampaign] = useState<PublicCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [related, setRelated] = useState<PublicCampaign[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modalCampaign, setModalCampaign] = useState<PublicCampaign | null>(null);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMissing(false);
    donationsApi
      .getCampaign(slug)
      .then((c) => { if (active) setCampaign(c); })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    donationsApi
      .listCampaigns()
      .then((list) => setRelated(list.filter((c) => c.slug !== slug).slice(0, 3)))
      .catch(() => {});
  }, [slug]);

  const niyyahLabel = t(`niyyah.${niyyah}.label`);

  const addCampaign = (c: PublicCampaign, amount: number, checkout: boolean) => {
    addItem({
      category: c.fundType,
      categoryTitle: c.fundType,
      fundKey: c.slug,
      label: c.title,
      campaignSlug: c.slug,
      amount,
    });
    setModalCampaign(null);
    if (checkout) setCartOpen(true);
  };

  const handleSuccess = (s: DonationSummary) => {
    clear();
    setSummary(s);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: campaign?.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* user cancelled share */ }
  };

  if (summary) {
    return (
      <div className="min-h-screen bg-[#fbfcfb]">
        <Navbar />
        <main><SuccessState locale={locale} summary={summary} onReset={() => setSummary(null)} /></main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfcfb]">
        <Navbar />
        <main className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-rmc-green" /></main>
        <Footer />
      </div>
    );
  }

  if (missing || !campaign) {
    return (
      <div className="min-h-screen bg-[#fbfcfb]">
        <Navbar />
        <main className="grid min-h-[60vh] place-items-center px-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-800">Campaign not found</p>
            <p className="mt-1 text-sm text-gray-500">It may have ended or been unpublished.</p>
            <Link href={`/${locale}/donate`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white hover:bg-rmc-green-dark">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> Back to all campaigns
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const deadline = deadlineLabel(campaign.endDate);
  const paragraphs = campaign.description.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[42vh] overflow-hidden bg-rmc-green-deep md:min-h-[52vh]">
          {campaign.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(campaign.heroImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rmc-green to-rmc-green-dark" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />

          <div className="relative z-10 mx-auto flex min-h-[42vh] max-w-5xl flex-col justify-end px-4 pb-8 pt-24 sm:px-6 md:min-h-[52vh] lg:px-8">
            <Link href={`/${locale}/donate`} className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> All campaigns
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rmc-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rmc-green-deep">{campaign.fundType}</span>
              {deadline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Clock className="h-3 w-3" /> {deadline}
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl">{campaign.title}</h1>
          </div>
        </section>

        {/* Body */}
        <section className="relative py-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-50" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {/* Story + gallery + updates */}
            <div className="space-y-10 lg:col-span-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">About this campaign</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)
                  ) : (
                    <p className="text-gray-400">No description yet.</p>
                  )}
                </div>
              </div>

              {campaign.galleryImages.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold text-gray-900">Gallery</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {campaign.galleryImages.map((key, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(key)} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {campaign.updates.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xl font-bold text-gray-900">Updates</h2>
                  <div className="space-y-4">
                    {campaign.updates.map((u) => (
                      <div key={u.id} className="relative rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-rmc-green/10 text-rmc-green"><HeartHandshake className="h-3.5 w-3.5" /></span>
                          <p className="text-[11px] font-semibold text-gray-400">{new Date(u.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">{u.title}</h3>
                        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-gray-600">{u.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky donate panel */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_40px_-24px_rgba(26,122,74,0.3)]">
                  <div className="border-b border-gray-100 p-6">
                    <CampaignProgress raised={campaign.receivedAmount} target={campaign.targetAmount} currency={campaign.currency} size="full" />
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {campaign.donationCount > 0 && (
                        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-rmc-green" /> {campaign.donationCount} donors</span>
                      )}
                      {deadline && (
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-rmc-gold" /> {deadline}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2.5 p-6">
                    <button
                      type="button"
                      onClick={() => setModalCampaign(campaign)}
                      className="w-full rounded-full bg-rmc-green px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
                    >
                      {campaign.ctaText?.trim() || 'Donate now'}
                    </button>
                    <button
                      type="button"
                      onClick={share}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                    >
                      {shared ? <><CheckCircle2 className="h-4 w-4 text-rmc-green" /> Link copied</> : <><Share2 className="h-4 w-4" /> Share</>}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-gray-100 bg-white py-12 md:py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="mb-6 text-xl font-bold text-gray-900">Other campaigns</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((c) => (
                  <CampaignCard key={c.id} campaign={c} locale={locale} onDonate={setModalCampaign} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />

      {/* Floating cart */}
      {cart.length > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-[60] inline-flex items-center gap-3 rounded-full bg-rmc-green px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-rmc-green/30 transition-colors hover:bg-rmc-green-dark animate-fade-up"
        >
          <span className="relative shrink-0">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rmc-gold px-1 text-[10px] font-bold text-rmc-green-deep">{cart.length}</span>
          </span>
          <span className="tabular-nums">{money(currency, total)}</span>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      )}

      <DonateModal campaign={modalCampaign} currency={currency} onClose={() => setModalCampaign(null)} onAdd={addCampaign} />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        currency={currency}
        total={total}
        niyyahLabel={niyyahLabel}
        niyyah={niyyah}
        locale={locale}
        onRemove={removeItem}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

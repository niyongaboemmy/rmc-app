'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBag, HandHeart, ArrowRight, Plus, Sparkles, Coins } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { donationCategoriesApi, type PublicCategory } from '@/lib/donationCategoriesApi';
import { useDonationCart } from '@/contexts/DonationCartContext';
import { CURRENCY_KEYS, money, type CartItem } from './donateData';
import { DonateHero } from './DonateHero';
import { ImpactStats } from './ImpactStats';
import { NiyyahBar } from './NiyyahBar';
import { FeaturedCampaign } from './FeaturedCampaign';
import { CampaignCard } from './CampaignCard';
import { CategoryTabs } from './CategoryTabs';
import { DonateModal } from './DonateModal';
import { ZakatCalculator } from './ZakatCalculator';
import { TrustBand } from './TrustBand';
import { CartDrawer } from './CartDrawer';
import { AmountPicker } from './AmountPicker';
import { SuccessState, type DonationSummary } from './SuccessState';

export function DonatePageClient({ initialCause: _initialCause }: { initialCause?: string }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('donate');

  // Cart, currency and niyyah live in a persisted context (survives navigation
  // and reloads); donor details in the checkout drawer stay ephemeral.
  const { cart, currency, niyyah, total, addItem, removeItem, clear, setCurrency, setNiyyah } =
    useDonationCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [activeCat, setActiveCat] = useState('all');
  const [donateFor, setDonateFor] = useState<PublicCampaign | null>(null);

  // Live, admin-managed campaigns (received = completed transactions) — the whole
  // page is driven by these; nothing is hardcoded.
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    donationsApi
      .listCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  // Category labels (for the filter tabs + cart metadata), localized.
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  useEffect(() => {
    donationCategoriesApi
      .listPublic(locale)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [locale]);
  const categoryLabel = useCallback(
    (key: string) => categories.find((c) => c.key === key)?.title ?? key,
    [categories],
  );

  // Featured campaign gets the hero block and is kept out of the grid.
  const featured = useMemo(() => campaigns.find((c) => c.isFeatured) ?? null, [campaigns]);
  const gridSource = useMemo(
    () => (featured ? campaigns.filter((c) => c.id !== featured.id) : campaigns),
    [campaigns, featured],
  );

  // Filter tabs — "All" plus every category that actually has campaigns.
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of gridSource) counts.set(c.fundType, (counts.get(c.fundType) ?? 0) + 1);
    const catTabs = Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: categoryLabel(key), count }))
      .sort((a, b) => b.count - a.count);
    return [{ key: 'all', label: 'All', count: gridSource.length }, ...catTabs];
  }, [gridSource, categoryLabel]);

  const gridCampaigns = useMemo(
    () => (activeCat === 'all' ? gridSource : gridSource.filter((c) => c.fundType === activeCat)),
    [gridSource, activeCat],
  );

  const niyyahLabel = t(`niyyah.${niyyah}.label`);

  const handleSuccess = (donationSummary: DonationSummary) => {
    clear();
    setSummary(donationSummary);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setSummary(null);
    clear();
  };

  // Route a campaign donation into the existing cart (one cart item = one
  // campaign line, exactly what the checkout engine expects).
  const addCampaign = (campaign: PublicCampaign, amount: number, checkout: boolean) => {
    addItem({
      category: campaign.fundType,
      categoryTitle: categoryLabel(campaign.fundType),
      fundKey: campaign.slug,
      label: campaign.title,
      campaignSlug: campaign.slug,
      amount,
    });
    setDonateFor(null);
    if (checkout) setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <Navbar />
      <main>
        {summary ? (
          <SuccessState locale={locale} summary={summary} onReset={reset} />
        ) : (
          <>
            <DonateHero />
            <ImpactStats campaigns={campaigns} />
            <div className="mt-8">
              <NiyyahBar niyyah={niyyah} onNiyyah={setNiyyah} />
            </div>

            {/* ── Campaigns — full-width, the heart of the page ── */}
            <section id="campaigns" className="relative scroll-mt-24 py-10 md:py-14">
              <div className="pointer-events-none absolute inset-0 pattern-light opacity-60" />
              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Toolbar */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rmc-gold">
                      <Coins className="h-3.5 w-3.5" /> {t('sectionSub')}
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900 md:text-[28px]">{t('sectionHeading')}</h2>
                  </div>
                  <CurrencyToggle currency={currency} onCurrency={setCurrency} label={t('quickGive.currency')} />
                </div>

                {/* Featured */}
                {featured && (
                  <div className="mb-10">
                    <FeaturedCampaign campaign={featured} locale={locale} onDonate={setDonateFor} />
                  </div>
                )}

                <div className="mb-5">
                  <CategoryTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-80 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : gridCampaigns.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {gridCampaigns.map((c) => (
                      <CampaignCard key={c.id} campaign={c} locale={locale} onDonate={setDonateFor} />
                    ))}
                  </div>
                ) : (
                  <EmptyCampaigns hasFeatured={!!featured} />
                )}
              </div>
            </section>

            {/* ── More ways to give — general fund + Zakat, a deliberate band ── */}
            <section id="give" className="relative scroll-mt-24 border-t border-rmc-green/10 bg-gradient-to-b from-rmc-green-light/25 to-transparent py-12 md:py-16">
              <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 text-center">
                  <p className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rmc-gold">
                    <HandHeart className="h-3.5 w-3.5" /> Give your way
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">More ways to give</h2>
                </div>
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <QuickGive currency={currency} onAdd={addItem} />
                  <div className="rounded-lg border border-rmc-gold/25 bg-white p-1 shadow-sm">
                    <ZakatCalculator currency={currency} onAddZakat={addItem} />
                  </div>
                </div>
              </div>
            </section>

            <TrustBand />
          </>
        )}
      </main>
      <Footer />

      {/* Floating cart — desktop pill + mobile bar; both open the checkout drawer */}
      {!summary && cart.length > 0 && !cartOpen && (
        <>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-[60] hidden items-center gap-3 rounded-full bg-rmc-green px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-rmc-green/30 transition-colors hover:bg-rmc-green-dark lg:flex animate-fade-up"
          >
            <span className="relative shrink-0">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rmc-gold px-1 text-[10px] font-bold text-rmc-green-deep">
                {cart.length}
              </span>
            </span>
            <span className="tabular-nums">{money(currency, total)}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>

          <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-100 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden animate-fade-up">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg bg-rmc-green px-5 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              <span className="relative shrink-0">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rmc-gold px-1 text-[10px] font-bold text-rmc-green-deep">
                  {cart.length}
                </span>
              </span>
              <span className="flex-1 text-left">{t('floatingCart')}</span>
              <span className="tabular-nums">{money(currency, total)}</span>
              <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" />
            </button>
          </div>
        </>
      )}

      <DonateModal campaign={donateFor} currency={currency} onClose={() => setDonateFor(null)} onAdd={addCampaign} />

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

/* Page-wide currency switcher (sets the currency used for every donation). */
function CurrencyToggle({
  currency,
  onCurrency,
  label,
}: {
  currency: string;
  onCurrency: (c: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400 sm:inline">
        {label}
      </span>
      <div className="flex shrink-0 gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {CURRENCY_KEYS.map((cur) => (
          <button
            key={cur}
            type="button"
            onClick={() => onCurrency(cur)}
            aria-pressed={currency === cur}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
              currency === cur ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'
            }`}
          >
            {cur}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Friendly empty state when no campaigns are active — the general fund below
   still works, so donors are never stuck. */
function EmptyCampaigns({ hasFeatured }: { hasFeatured: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/60 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-rmc-green/10 text-rmc-green">
        <Sparkles className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-bold text-gray-800">
        {hasFeatured ? 'More campaigns coming soon' : 'No active campaigns right now'}
      </p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        You can still give to our general fund below — every gift supports the community.
      </p>
    </div>
  );
}

/* General-fund quick give — custom/preset amount straight to the general fund. */
function QuickGive({
  currency,
  onAdd,
}: {
  currency: string;
  onAdd: (item: Omit<CartItem, 'id'>) => void;
}) {
  const t = useTranslations('donate');
  const [amount, setAmount] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const onAmount = useCallback((n: number) => setAmount(n), []);

  const add = () => {
    if (amount <= 0) return;
    onAdd({
      category: 'general',
      categoryTitle: t('general.categoryTitle'),
      fundKey: 'general',
      label: t('general.label'),
      campaignSlug: null,
      amount,
    });
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-rmc-green/15 bg-white shadow-sm">
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-rmc-green/10 bg-gradient-to-br from-rmc-green-light/70 via-rmc-green-light/30 to-white px-5 py-4">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-rmc-gold/10 blur-2xl" />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rmc-green text-white shadow-sm shadow-rmc-green/30">
          <HandHeart className="h-5 w-5" />
        </span>
        <div className="relative min-w-0">
          <h3 className="text-[15px] font-bold leading-tight text-gray-900">{t('quickGive.title')}</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{t('quickGive.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <AmountPicker key={`${currency}-${resetKey}`} currency={currency} onAmount={onAmount} />
        <button
          type="button"
          onClick={add}
          disabled={amount <= 0}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          {t('card.addToGift')}
        </button>
      </div>
    </div>
  );
}

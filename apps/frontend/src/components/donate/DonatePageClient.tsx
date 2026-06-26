'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBag, HandHeart, ArrowRight, Plus } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { donationCategoriesApi, type PublicCategory } from '@/lib/donationCategoriesApi';
import { useDonationCart } from '@/contexts/DonationCartContext';
import {
  CURRENCY_KEYS,
  money,
  type CartItem,
} from './donateData';
import { EVENTS } from './eventsBridge';
import { SpiritualHeader } from './SpiritualHeader';
import { CategoryGrid } from './CategoryGrid';
import { ZakatCalculator } from './ZakatCalculator';
import { ImpactBars } from './ImpactBars';
import { GiftSummary } from './GiftSummary';
import { CartDrawer } from './CartDrawer';
import { AmountPicker } from './AmountPicker';
import { SuccessState, type DonationSummary } from './SuccessState';

export function DonatePageClient({ initialCause }: { initialCause?: string }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('donate');

  // Deep-link: arriving from an event's Donate button (?cause=<id>) opens the
  // Events category with that event pre-selected.
  const initialEvent = initialCause && EVENTS.some((e) => e.id === initialCause) ? initialCause : null;

  // Cart, currency and niyyah live in a persisted context (survives page
  // navigation and reloads); donor details below stay ephemeral.
  const { cart, currency, niyyah, total, addItem, removeItem, clear, setCurrency, setNiyyah } =
    useDonationCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [summary, setSummary] = useState<DonationSummary | null>(null);

  // Live campaign funding (raised = completed transactions) — same figures as
  // the admin Programs tab; falls back to static data if unavailable.
  const [liveCampaigns, setLiveCampaigns] = useState<PublicCampaign[]>([]);
  useEffect(() => {
    donationsApi
      .listCampaigns()
      .then(setLiveCampaigns)
      .catch(() => {});
  }, []);
  const liveBySlug = useMemo(() => {
    const m = new Map<string, PublicCampaign>();
    liveCampaigns.forEach((c) => m.set(c.slug, c));
    return m;
  }, [liveCampaigns]);

  // Admin-managed categories & sub-funds (localized to the current locale).
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  useEffect(() => {
    donationCategoriesApi
      .listPublic(locale)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [locale]);

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {summary ? (
          <SuccessState locale={locale} summary={summary} onReset={reset} />
        ) : (
          <>
            <SpiritualHeader niyyah={niyyah} onNiyyah={setNiyyah} />

            <section className="relative bg-transparent py-8 md:py-10">
              <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent" />

              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <div>
                      <h2 className="mb-1 text-xl font-bold text-gray-900">{t('sectionHeading')}</h2>
                      <p className="mb-4 text-sm text-gray-500">{t('sectionSub')}</p>
                      <CategoryGrid
                        categories={categories}
                        currency={currency}
                        liveBySlug={liveBySlug}
                        campaigns={liveCampaigns}
                        onAdd={addItem}
                        initialEvent={initialEvent}
                      />
                    </div>
                    <ImpactBars campaigns={liveCampaigns} />
                  </div>

                  {/* Right rail: quick-give + the always-visible cart, sticky on
                      desktop and stacked beneath the categories on mobile (a
                      quick-checkout bar floats below). */}
                  <aside className="lg:col-span-1">
                    <div className="space-y-6 lg:sticky lg:top-24">
                      <QuickGive currency={currency} onCurrency={setCurrency} onAdd={addItem} />
                      <GiftSummary
                        items={cart}
                        currency={currency}
                        total={total}
                        niyyahLabel={niyyahLabel}
                        onRemove={removeItem}
                        onCheckout={() => setCartOpen(true)}
                      />
                    </div>
                  </aside>
                </div>
              </div>
            </section>

            {/* Zakat calculator — a self-serve estimator at the foot of the page */}
            <section className="relative bg-transparent pb-12 md:pb-16">
              <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                <ZakatCalculator currency={currency} onAddZakat={addItem} />
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />

      {/* Mobile quick-checkout bar — keeps the running total in reach while
          scrolling categories (desktop uses the sticky sidebar instead). */}
      {!summary && cart.length > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-100 bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden animate-fade-up">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-full bg-rmc-green px-5 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors duration-300 hover:bg-rmc-green-dark"
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
      )}

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

/* Compact "I know where I want to give" card — custom/preset amount straight
   to the general fund, plus the currency switcher for the whole page. */
function QuickGive({
  currency,
  onCurrency,
  onAdd,
}: {
  currency: string;
  onCurrency: (c: string) => void;
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
    <div className="overflow-hidden rounded-2xl border border-rmc-green/15 bg-white shadow-sm ring-1 ring-black/5">
      {/* Accent header */}
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-rmc-green/10 bg-gradient-to-br from-rmc-green-light/70 via-rmc-green-light/30 to-white px-5 py-4">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-rmc-gold/10 blur-2xl" />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rmc-green text-white shadow-sm shadow-rmc-green/30">
          <HandHeart className="h-5 w-5" />
        </span>
        <div className="relative min-w-0">
          <h2 className="text-[15px] font-bold leading-tight text-gray-900">{t('quickGive.title')}</h2>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{t('quickGive.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-3.5 p-5">
        {/* Currency switcher — sets the currency for the whole page */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
            {t('quickGive.currency')}
          </span>
          <div className="flex shrink-0 gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
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

        <AmountPicker key={`${currency}-${resetKey}`} currency={currency} onAmount={onAmount} />

        <button
          type="button"
          onClick={add}
          disabled={amount <= 0}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          {t('card.addToGift')}
        </button>
      </div>
    </div>
  );
}

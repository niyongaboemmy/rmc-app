'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { donationCategoriesApi, type PublicCategory } from '@/lib/donationCategoriesApi';
import { useDonationCart } from '@/contexts/DonationCartContext';
import { money } from './donateData';
import { SpiritualHeader } from './SpiritualHeader';
import { CategoryGrid } from './CategoryGrid';
import { QuickGive } from './QuickGive';
import { ZakatCalculator } from './ZakatCalculator';
import { ImpactBars } from './ImpactBars';
import { GiftSummary } from './GiftSummary';
import { CartDrawer } from './CartDrawer';
import { SuccessState, type DonationSummary } from './SuccessState';

export function DonatePageClient() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('donate');

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
            className="flex w-full items-center gap-3 rounded-lg bg-rmc-green px-5 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors duration-300 hover:bg-rmc-green-dark"
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

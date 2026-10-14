'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBag, ArrowRight, HeartHandshake } from 'lucide-react';
import { pick } from '@/lib/content-api';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { donationsApi, type PublicCampaign } from '@/lib/donationsApi';
import { donationCategoriesApi, type PublicCategory } from '@/lib/donationCategoriesApi';
import { useDonationCart } from '@/contexts/DonationCartContext';
import { CURRENCY_KEYS, money, type CartItem } from './donateData';
import { DonateHero } from './DonateHero';
import { CategoryGrid } from './CategoryGrid';
import { QuickGive } from './QuickGive';
import { ZakatCalculator } from './ZakatCalculator';
import { CartDrawer } from './CartDrawer';
import { SuccessState, type DonationSummary } from './SuccessState';

export function DonatePageClient() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('donate');

  // Cart, currency and niyyah live in a persisted context (survives page
  // navigation and reloads); donor details in the checkout drawer stay ephemeral.
  const { cart, currency, niyyah, total, addItem, removeItem, updateAmount, clear, setCurrency, setNiyyah } =
    useDonationCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [summary, setSummary] = useState<DonationSummary | null>(null);

  /**
   * A one-cause gift going straight to checkout, deliberately kept OUT of the
   * persisted cart. A donor who clicks "Donate now" on a single program means
   * that program and nothing else — paying their whole running gift instead, or
   * emptying it afterwards, would both be wrong. So the drawer is fed from this
   * when set, and from the cart when it isn't.
   */
  const [directItem, setDirectItem] = useState<CartItem | null>(null);

  const donateNow = (item: Omit<CartItem, 'id'>) => {
    setDirectItem({ ...item, id: 'direct' });
    setCartOpen(true);
  };

  const closeCheckout = () => {
    setCartOpen(false);
    setDirectItem(null);
  };

  const checkoutItems = directItem ? [directItem] : cart;
  const checkoutTotal = directItem ? directItem.amount : total;

  // Live campaign funding (raised = completed transactions).
  const [liveCampaigns, setLiveCampaigns] = useState<PublicCampaign[]>([]);
  useEffect(() => {
    donationsApi.listCampaigns().then(setLiveCampaigns).catch(() => {});
  }, []);
  /**
   * Honour a `#campaign-…` anchor once the campaigns have actually rendered.
   *
   * The project pages link here with one. The browser resolves a hash at load,
   * and at load this list is empty — the campaigns arrive from a fetch a moment
   * later — so the jump finds nothing and silently does nothing. Every project's
   * "Support this project" would have landed at the top of the donate page and
   * looked like it had simply ignored the link.
   *
   * Runs once, after the first batch arrives. A rAF lets the cards paint before
   * the scroll is measured; without it the target's position is read while the
   * grid is still laying out.
   */
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !liveCampaigns.length) return;
    const id = window.location.hash.slice(1);
    if (!id.startsWith('campaign-')) return;

    jumped.current = true;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [liveCampaigns]);

  const liveBySlug = useMemo(() => {
    const m = new Map<string, PublicCampaign>();
    liveCampaigns.forEach((c) => m.set(c.slug, c));
    return m;
  }, [liveCampaigns]);

  // Admin-managed categories & sub-funds (localized to the current locale).
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [catsLoaded, setCatsLoaded] = useState(false);
  useEffect(() => {
    setCatsLoaded(false);
    donationCategoriesApi
      .listPublic(locale)
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatsLoaded(true));
  }, [locale]);

  const niyyahLabel = t(`niyyah.${niyyah}.label`);

  // The floating gift control (desktop pill / mobile bar) lands in the same
  // bottom-right corner as the site-wide Ask-AI launcher, at the same z-index.
  // Flagging it on <body> lets the launcher lift itself for exactly as long as
  // the control is on screen. See globals.css → `.ask-launcher`.
  const showFloatingCart = !summary && cart.length > 0 && !cartOpen;
  useEffect(() => {
    if (!showFloatingCart) return;
    document.body.dataset.bottomBar = 'true';
    return () => {
      delete document.body.dataset.bottomBar;
    };
  }, [showFloatingCart]);

  const handleSuccess = (donationSummary: DonationSummary) => {
    // Only a cart checkout empties the cart. A direct gift leaves whatever the
    // donor was still assembling exactly where they left it.
    if (!directItem) clear();
    setDirectItem(null);
    setSummary(donationSummary);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Nothing to clear here — handleSuccess already emptied the cart if this was a
  // cart checkout, and after a direct gift the cart is still wanted.
  const reset = () => setSummary(null);

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <Navbar />
      <main>
        {summary ? (
          <SuccessState locale={locale} summary={summary} onReset={reset} />
        ) : (
          <>
            <DonateHero niyyah={niyyah} onNiyyah={setNiyyah} currency={currency} />

            {/* ── Causes — the heart of the page ── */}
            <section id="causes" className="scroll-mt-20 py-12 md:py-16">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-[28px]">
                      {t('sectionHeading')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{t('sectionSub')}</p>
                  </div>
                  <CurrencyToggle currency={currency} onCurrency={setCurrency} label={t('quickGive.currency')} />
                </div>

                {!catsLoaded ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-72 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : categories.length === 0 && liveCampaigns.length === 0 ? (
                  <div className="mx-auto max-w-md rounded-lg border border-dashed border-gray-200 bg-white/60 p-10 text-center">
                    <HeartHandshake className="mx-auto mb-3 h-9 w-9 text-gray-300" aria-hidden="true" />
                    <p className="text-sm font-semibold text-gray-700">
                      {pick({ en: 'No causes yet', rw: 'Nta mpamvu irahari', ar: 'لا توجد قضايا بعد' }, locale)}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                      {pick(
                        {
                          en: 'Donation causes and programs will appear here once they are added. You can still give to the general fund or your Zakat below.',
                          rw: "Impamvu na gahunda zo gutanga zizagaragara hano nyuma yo kongerwaho. Ushobora gutanga ku kigega rusange cyangwa Zakat yawe hepfo.",
                          ar: 'ستظهر قضايا وبرامج التبرع هنا بمجرد إضافتها. لا يزال بإمكانك التبرع للصندوق العام أو زكاتك أدناه.',
                        },
                        locale,
                      )}
                    </p>
                  </div>
                ) : (
                  <CategoryGrid
                    categories={categories}
                    currency={currency}
                    liveBySlug={liveBySlug}
                    campaigns={liveCampaigns}
                    onAdd={addItem}
                    onDonateNow={donateNow}
                  />
                )}
              </div>
            </section>

            {/* ── Give your way — general fund + Zakat ── */}
            <section id="give" className="scroll-mt-20 border-t border-gray-100 bg-white py-12 md:py-16">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-8 text-center text-xl font-bold text-gray-900">More ways to give</h2>
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <QuickGive currency={currency} onAdd={addItem} onDonateNow={donateNow} />
                  <ZakatCalculator
                    currency={currency}
                    onAddZakat={addItem}
                    onDonateZakatNow={donateNow}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />

      {/* Floating cart — desktop pill + mobile bar, both open the checkout drawer */}
      {showFloatingCart && (
        <>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-[60] hidden items-center gap-3 rounded-lg bg-rmc-green px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-rmc-green/30 transition-colors hover:bg-rmc-green-dark lg:flex animate-fade-up"
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

      <CartDrawer
        open={cartOpen}
        onClose={closeCheckout}
        items={checkoutItems}
        currency={currency}
        total={checkoutTotal}
        niyyahLabel={niyyahLabel}
        niyyah={niyyah}
        locale={locale}
        // Removing the only line of a direct gift means "never mind" — there is
        // nothing left to pay for, so back out rather than sit on an empty drawer.
        onRemove={directItem ? closeCheckout : removeItem}
        // A direct gift has no cart line to update, so its amount stays fixed —
        // the donor picked it on the card they came from.
        onAmountChange={directItem ? undefined : updateAmount}
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

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBag, HandHeart, ShieldCheck, Plus } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { donationsApi } from '@/lib/donationsApi';
import { buildDonationMessage } from '@/lib/donationMeta';
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

  const [recurring, setRecurring] = useState(false);
  const [method, setMethod] = useState('momo');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<DonationSummary | null>(null);

  // Live campaign funding (raised = completed transactions) — same figures as
  // the admin Programs tab; falls back to static data if unavailable.
  const [liveCampaigns, setLiveCampaigns] = useState<{ slug: string; receivedAmount: number; targetAmount: number }[]>([]);
  useEffect(() => {
    donationsApi
      .listCampaigns()
      .then((cs) => setLiveCampaigns(cs.map((c) => ({ slug: c.slug, receivedAmount: c.receivedAmount, targetAmount: c.targetAmount }))))
      .catch(() => {});
  }, []);
  const liveBySlug = useMemo(() => {
    const m = new Map<string, { slug: string; receivedAmount: number; targetAmount: number }>();
    liveCampaigns.forEach((c) => m.set(c.slug, c));
    return m;
  }, [liveCampaigns]);

  const niyyahLabel = t(`niyyah.${niyyah}.label`);
  const methodName = t(`methods.${method}.title`);

  const onCheckout = async () => {
    if (total <= 0 || submitting) return;
    // Mobile Money needs a phone number to send the payment request to.
    if (method === 'momo' && !phone.trim()) {
      setError(t('cart.phoneRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await Promise.all(
        cart.map((it) =>
          donationsApi.donate({
            campaignSlug: it.campaignSlug,
            amount: it.amount,
            currency,
            frequency: recurring ? 'monthly' : 'once',
            paymentMethod: method,
            donorName: anonymous ? undefined : name.trim() || undefined,
            donorEmail: email.includes('@') ? email.trim() : undefined,
            donorPhone: method === 'momo' ? phone.trim() : undefined,
            isAnonymous: anonymous,
            message: buildDonationMessage({ niyyah, category: it.category, fund: it.fundKey }),
          }),
        ),
      );
      // Donations awaiting gateway confirmation (e.g. a Mobile Money prompt the
      // donor still has to approve). When none, the success screen shows no
      // payment banner — the gift is already recorded.
      const pendingPaymentIds = created.filter((d) => d.status === 'pending').map((d) => d.id);
      const now = new Date();
      setSummary({
        reference: `RMC-${now.getTime().toString(36).toUpperCase()}`,
        dateStr: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: cart,
        currency,
        total,
        recurring,
        methodName,
        niyyahLabel,
        pendingPaymentIds,
      });
      // Pledges committed — empty the persisted cart (summary keeps its own snapshot).
      clear();
      setCartOpen(false);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t('cart.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSummary(null);
    clear();
    setPhone('');
    setError('');
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {summary ? (
          <section className="relative bg-transparent py-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SuccessState locale={locale} summary={summary} onReset={reset} />
            </div>
          </section>
        ) : (
          <>
            <SpiritualHeader niyyah={niyyah} onNiyyah={setNiyyah} />

            <section className="relative bg-transparent py-8 md:py-10">
              <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent" />

              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Quick give + currency */}
                <QuickGive currency={currency} onCurrency={setCurrency} onAdd={addItem} />

                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <div>
                      <h2 className="mb-1 text-xl font-bold text-gray-900">{t('sectionHeading')}</h2>
                      <p className="mb-4 text-sm text-gray-500">{t('sectionSub')}</p>
                      <CategoryGrid
                        currency={currency}
                        liveBySlug={liveBySlug}
                        onAdd={addItem}
                        initialEvent={initialEvent}
                      />
                    </div>
                    <ZakatCalculator currency={currency} onAddZakat={addItem} />
                  </div>

                  <aside className="space-y-6">
                    <ImpactBars liveBySlug={liveBySlug} />
                    <div className="flex items-start gap-3 rounded-2xl border border-rmc-green/15 bg-rmc-green-light/40 p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rmc-green" />
                      <p className="text-[12px] leading-relaxed text-gray-600">
                        {t.rich('reassurance', { b: (c) => <span className="font-semibold text-gray-900">{c}</span> })}
                      </p>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />

      {/* Floating cart button */}
      {!summary && cart.length > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-full bg-rmc-green px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rmc-green/30 transition-all duration-300 hover:bg-rmc-green-dark motion-safe:hover:scale-[1.03] animate-fade-up"
        >
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rmc-gold px-1 text-[10px] font-bold text-rmc-green-deep">
              {cart.length}
            </span>
          </span>
          {t('floatingCart')} · {money(currency, total)}
        </button>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        currency={currency}
        total={total}
        niyyahLabel={niyyahLabel}
        recurring={recurring}
        setRecurring={setRecurring}
        method={method}
        setMethod={setMethod}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        onRemove={removeItem}
        onCheckout={onCheckout}
        submitting={submitting}
        error={error}
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/15">
            <HandHeart className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{t('quickGive.title')}</h2>
            <p className="mt-0.5 text-[12.5px] text-gray-500">{t('quickGive.subtitle')}</p>
          </div>
        </div>
        {/* Currency switcher */}
        <div className="flex gap-1 self-start rounded-lg border border-gray-200 bg-gray-50 p-1 lg:self-auto">
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <AmountPicker key={`${currency}-${resetKey}`} currency={currency} onAmount={onAmount} />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={amount <= 0}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t('card.add')} {amount > 0 ? money(currency, amount) : t('quickGive.addToGift')}
        </button>
      </div>
    </div>
  );
}

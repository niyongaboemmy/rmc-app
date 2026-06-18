'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  HandHeart,
  Smartphone,
  CreditCard,
  Landmark,
  Wallet,
  Lock,
  Check,
  CheckCircle2,
  ArrowRight,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EVENTS, badgeClass, fundedPercent, formatMoney } from '@/components/activities/data';
import { donationsApi, PublicCampaign } from '@/lib/donationsApi';

/* ──────────────────────────────────────────────────────────────
   Static config — programs, frequencies, currencies, methods.
   ────────────────────────────────────────────────────────────── */
type IconType = React.ComponentType<{ className?: string }>;

const FREQUENCIES: { key: string; label: string; hint: string }[] = [
  { key: 'once', label: 'One-time', hint: 'A single gift' },
  { key: 'monthly', label: 'Monthly', hint: 'Recurring each month' },
  { key: 'yearly', label: 'Yearly', hint: 'Recurring each year' },
];

const CURRENCIES: Record<string, { symbol: string; presets: number[] }> = {
  RWF: { symbol: 'RWF', presets: [5000, 10000, 25000, 50000, 100000] },
  USD: { symbol: '$', presets: [10, 25, 50, 100, 250] },
  EUR: { symbol: '€', presets: [10, 25, 50, 100, 250] },
  GBP: { symbol: '£', presets: [10, 25, 50, 100, 250] },
};
const CURRENCY_KEYS = Object.keys(CURRENCIES);

const METHODS: { key: string; title: string; desc: string; Icon: IconType }[] = [
  { key: 'momo', title: 'Mobile Money', desc: 'MTN MoMo · Airtel', Icon: Smartphone },
  { key: 'card', title: 'Card', desc: 'Visa · Mastercard', Icon: CreditCard },
  { key: 'bank', title: 'Bank Transfer', desc: 'Direct deposit', Icon: Landmark },
  { key: 'paypal', title: 'PayPal', desc: 'PayPal balance', Icon: Wallet },
];

const HERO_IMG = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=1600&auto=format&fit=crop';

function money(cur: string, n: number) {
  const num = n.toLocaleString('en-US');
  return cur === 'RWF' ? `RWF ${num}` : `${CURRENCIES[cur].symbol}${num}`;
}

/* Small numbered step header for each form card. */
function StepHead({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green-light text-sm font-bold text-rmc-green ring-1 ring-rmc-green/15">
        {n}
      </span>
      <div>
        <h2 className="text-base font-bold leading-none text-gray-900">{title}</h2>
        {desc && <p className="mt-1 text-[12px] text-gray-400">{desc}</p>}
      </div>
    </div>
  );
}

export function DonatePageClient({ initialCause }: { initialCause?: string }) {
  const { locale } = useParams<{ locale: string }>();

  // Pre-select a cause when arriving from an event's Donate button (?cause=<id>)
  const [program, setProgram] = useState(() =>
    initialCause && (initialCause === 'general' || EVENTS.some((e) => e.id === initialCause))
      ? initialCause
      : 'general',
  );
  const [frequency, setFrequency] = useState('once');
  const [currency, setCurrency] = useState('RWF');
  const [preset, setPreset] = useState<number | null>(CURRENCIES.RWF.presets[1]);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('momo');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Live program funding (raised = completed donation transactions) — same
  // figures as the admin Programs tab. Falls back to static data if unavailable.
  const [liveCampaigns, setLiveCampaigns] = useState<PublicCampaign[]>([]);
  useEffect(() => {
    donationsApi.listCampaigns().then(setLiveCampaigns).catch(() => {});
  }, []);
  const liveBySlug = useMemo(() => {
    const m = new Map<string, PublicCampaign>();
    liveCampaigns.forEach((c) => m.set(c.slug, c));
    return m;
  }, [liveCampaigns]);

  const amount = custom.trim() ? Math.max(0, Math.floor(Number(custom) || 0)) : preset ?? 0;
  const programName =
    program === 'general' ? 'Where most needed' : EVENTS.find((e) => e.id === program)?.title ?? 'Where most needed';
  const methodName = METHODS.find((m) => m.key === method)?.title ?? '';
  const freqMeta = FREQUENCIES.find((f) => f.key === frequency);
  const recurring = frequency !== 'once';
  const canDonate = amount > 0;

  const onCurrency = (cur: string) => {
    setCurrency(cur);
    setPreset(CURRENCIES[cur].presets[1]);
    setCustom('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDonate || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await donationsApi.donate({
        campaignSlug: program === 'general' ? null : program,
        amount,
        currency,
        frequency: frequency as 'once' | 'monthly' | 'yearly',
        paymentMethod: method,
        donorName: anonymous ? undefined : name.trim() || undefined,
        donorEmail: email.includes('@') ? email.trim() : undefined,
        isAnonymous: anonymous,
      });
      setSubmitted(true);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('We could not record your donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ── HERO ── */}
        <section className="relative flex min-h-[42vh] items-center overflow-hidden bg-rmc-green-deep">
          <Image src={HERO_IMG} alt="" fill priority className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
          <div className="absolute inset-0 pattern-islamic opacity-30" />

          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-24 pb-14 text-center sm:px-6 lg:px-8">
            <div className="animate-fade-up">
              <p className="mb-3 font-arabic text-lg leading-loose text-rmc-gold-light drop-shadow md:text-xl" dir="rtl">
                وَتَعَاوَنُوا عَلَى الْبِرِّ
              </p>
              <h1 className="mb-4 text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-4xl">
                Give with RMC
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                Your Sadaqah sustains mosques, schools, orphans and families across Rwanda. Choose a cause and give
                securely.
              </p>
            </div>
          </div>
        </section>

        {/* ── BODY ── */}
        <section className="relative bg-transparent py-16 md:py-20">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {submitted ? (
              /* ── Thank-you state ── */
              <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-black/5 animate-fade-up sm:p-10">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-light ring-1 ring-rmc-green/15">
                  <CheckCircle2 className="h-8 w-8 text-rmc-green" />
                </span>
                <p className="mb-1 font-arabic text-xl text-rmc-green-dark" dir="rtl">جَزَاكَ اللَّهُ خَيْرًا</p>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Thank you for your generosity</h2>
                <p className="mb-6 text-sm leading-relaxed text-gray-500">
                  You&apos;re about to give <span className="font-bold text-gray-900">{money(currency, amount)}</span>
                  {recurring ? ` ${frequency}` : ''} to <span className="font-bold text-gray-900">{programName}</span> via{' '}
                  {methodName}. You&apos;ll be redirected to our secure payment partner to complete it.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href={`/${locale}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-rmc-green-dark"
                  >
                    Back to home
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rmc-green/30 px-6 py-2.5 text-sm font-bold text-rmc-green transition-all duration-300 hover:bg-rmc-green hover:text-white"
                  >
                    Make another donation
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                {/* ════ FORM ════ */}
                <form id="donate-form" onSubmit={onSubmit} className="space-y-6 lg:col-span-3">
                  {/* 1 — Cause */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 animate-fade-up">
                    <StepHead n={1} title="Choose a cause" desc="Support a specific upcoming event, or give where it's needed most." />

                    {/* General fund */}
                    <button
                      type="button"
                      onClick={() => setProgram('general')}
                      aria-pressed={program === 'general'}
                      className={`relative flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                        program === 'general'
                          ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30'
                          : 'border-gray-200 hover:border-rmc-green/40 hover:bg-rmc-green-light/20'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
                          program === 'general' ? 'bg-rmc-green text-white ring-rmc-green/30' : 'bg-rmc-green-light text-rmc-green ring-rmc-green/10'
                        }`}
                      >
                        <HandHeart className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-gray-900">Where most needed</span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-gray-500">Let RMC direct your gift to the greatest need.</span>
                      </span>
                      {program === 'general' && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rmc-green text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>

                    {/* Upcoming events — with funding progress */}
                    <p className="mb-3 mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                      Or support an upcoming event
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {EVENTS.map((ev) => {
                        const active = program === ev.id;
                        // Prefer live figures (raised = completed transactions); fall back to static.
                        const live = liveBySlug.get(ev.id);
                        const raised = live ? live.receivedAmount : ev.raisedAmount;
                        const goal = live ? live.targetAmount : ev.goalAmount;
                        const pct = fundedPercent(raised, goal);
                        const funded = pct >= 100;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setProgram(ev.id)}
                            aria-pressed={active}
                            className={`relative flex flex-col rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                              active ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40 hover:bg-rmc-green-light/20'
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className={badgeClass(ev.tone)}>{ev.type}</span>
                              {active && (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rmc-green text-white">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            <h3 className=" text-sm font-medium leading-snug text-gray-900">{ev.title}</h3>

                            {/* Funding — current / needed */}
                            <div className="mt-auto pt-3">
                              <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                                <span className="font-bold tabular-nums text-gray-900">
                                  RWF {formatMoney(raised)}
                                  <span className="font-medium text-gray-400"> / {formatMoney(goal)}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${funded ? 'text-[#8A6A0F]' : 'text-rmc-green'}`}>
                                  {funded && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full ${funded ? 'bg-rmc-gold-light' : 'bg-rmc-green'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2 — Frequency (recurring) */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 animate-fade-up">
                    <StepHead n={2} title="Frequency" desc="Give once, or set up a recurring gift." />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {FREQUENCIES.map(({ key, label, hint }) => {
                        const active = frequency === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFrequency(key)}
                            aria-pressed={active}
                            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                              active ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {key === 'once' ? <HandHeart className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-gray-900">{label}</span>
                              <span className="block text-[11px] text-gray-400">{hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {recurring && (
                      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-rmc-green-dark">
                        <Repeat className="h-3.5 w-3.5 shrink-0" />
                        Recurring gift — you can pause or cancel anytime.
                      </p>
                    )}
                  </div>

                  {/* 3 — Amount & currency */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 animate-fade-up">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <StepHead n={3} title="Amount" desc="Pick an amount or enter your own." />
                      {/* Currency switcher */}
                      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
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

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {CURRENCIES[currency].presets.map((p) => {
                        const active = !custom.trim() && preset === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPreset(p);
                              setCustom('');
                            }}
                            aria-pressed={active}
                            className={`rounded-xl border py-3 text-sm font-bold tabular-nums transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                              active ? 'border-rmc-green bg-rmc-green text-white shadow-sm' : 'border-gray-200 text-gray-700 hover:border-rmc-green/40 hover:bg-rmc-green-light/20'
                            }`}
                          >
                            {money(currency, p)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom amount */}
                    <div className="mt-3">
                      <label htmlFor="custom-amount" className="mb-1.5 block text-[12px] font-medium text-gray-500">
                        Or enter a custom amount
                      </label>
                      <div className={`flex items-center overflow-hidden rounded-xl border bg-white transition-colors ${custom.trim() ? 'border-rmc-green ring-1 ring-rmc-green/30' : 'border-gray-200'}`}>
                        <span className="select-none border-r border-gray-200 bg-gray-50 px-3.5 py-3 text-sm font-bold text-gray-500">
                          {CURRENCIES[currency].symbol}
                        </span>
                        <input
                          id="custom-amount"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="Enter amount"
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-sm font-semibold tabular-nums text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 — Payment method */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 animate-fade-up">
                    <StepHead n={4} title="Payment method" desc="How would you like to give?" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {METHODS.map(({ key, title, desc, Icon }) => {
                        const active = method === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setMethod(key)}
                            aria-pressed={active}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                              active ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40 hover:bg-rmc-green-light/20'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${active ? 'text-rmc-green' : 'text-gray-400'}`} />
                            <span className="text-[13px] font-bold leading-none text-gray-900">{title}</span>
                            <span className="text-[10px] leading-tight text-gray-400">{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5 — Your details */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 animate-fade-up">
                    <StepHead n={5} title="Your details" desc="So we can send you a receipt (optional)." />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="donor-name" className="mb-1.5 block text-[12px] font-medium text-gray-500">Full name</label>
                        <input
                          id="donor-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={anonymous}
                          placeholder={anonymous ? 'Anonymous donor' : 'Your name'}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="donor-email" className="mb-1.5 block text-[12px] font-medium text-gray-500">Email</label>
                        <input
                          id="donor-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                        />
                      </div>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-gray-600">
                      <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-rmc-green accent-rmc-green"
                      />
                      Make this donation anonymous
                    </label>
                  </div>
                </form>

                {/* ════ SUMMARY (sticky) ════ */}
                <aside className="lg:col-span-2">
                  <div className="lg:sticky lg:top-24 space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 animate-fade-up">
                      <div className="relative bg-rmc-green-deep px-6 py-5 text-white">
                        <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent" />
                        <p className="relative text-[11px] font-bold uppercase tracking-[0.14em] text-rmc-gold-light">Your donation</p>
                        <p className="relative mt-1 text-3xl font-bold tabular-nums">
                          {money(currency, amount)}
                          {recurring && <span className="ml-1 text-sm font-semibold text-white/60">/ {frequency === 'monthly' ? 'mo' : 'yr'}</span>}
                        </p>
                      </div>

                      <dl className="divide-y divide-gray-100 px-6 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3 py-2.5">
                          <dt className="text-gray-400">Cause</dt>
                          <dd className="font-semibold text-gray-900">{programName}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-2.5">
                          <dt className="text-gray-400">Frequency</dt>
                          <dd className="font-semibold text-gray-900">{freqMeta?.label}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-2.5">
                          <dt className="text-gray-400">Method</dt>
                          <dd className="font-semibold text-gray-900">{methodName}</dd>
                        </div>
                      </dl>

                      <div className="px-6 pb-6 pt-2">
                        <button
                          type="submit"
                          form="donate-form"
                          disabled={!canDonate || submitting}
                          className="group flex w-full items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:enabled:hover:scale-[1.02]"
                        >
                          <HandHeart className="h-4 w-4 shrink-0" />
                          {submitting ? 'Processing…' : canDonate ? `Donate ${money(currency, amount)}` : 'Enter an amount'}
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                        {error && (
                          <p className="mt-3 text-center text-[12px] font-medium text-red-600">{error}</p>
                        )}
                        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                          <Lock className="h-3 w-3 shrink-0" />
                          Secure &amp; encrypted payment
                        </p>
                      </div>
                    </div>

                    {/* Reassurance */}
                    <div className="flex items-start gap-3 rounded-2xl border border-rmc-green/15 bg-rmc-green-light/40 p-4 animate-fade-up">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rmc-green" />
                      <p className="text-[12px] leading-relaxed text-gray-600">
                        Your gift is <span className="font-semibold text-gray-900">Sadaqah Jariyah</span> — ongoing charity.
                        100% goes to the cause you choose, and you&apos;ll receive a receipt by email.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

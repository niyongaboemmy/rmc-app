'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, Plus, CheckCircle2, X, Sparkles } from 'lucide-react';
import { EVENTS, badgeClass, fundedPercent, formatMoney, type PublicCampaignLike } from './eventsBridge';
import { CATEGORIES, SUBFUNDS, EVENT_IMAGE, toneChip, money, type CartItem } from './donateData';
import { AmountPicker } from './AmountPicker';

type NewItem = Omit<CartItem, 'id'>;

/* Funding figures shown on event cause cards. */
interface Funding {
  raised: number;
  goal: number;
  pct: number;
  funded: boolean;
  badge: string;
  type: string;
}

/* A unified "cause" shape covering both static sub-funds and live events.
   All strings are already localized by the time a Cause is built. */
interface Cause {
  fundKey: string;
  label: string;
  long: string;
  examples: string[];
  impact: string;
  image: string;
  campaignSlug: string | null;
  funding?: Funding;
}

export function CategoryGrid({
  currency,
  liveBySlug,
  onAdd,
  initialEvent,
}: {
  currency: string;
  liveBySlug: Map<string, PublicCampaignLike>;
  onAdd: (item: NewItem) => void;
  initialEvent?: string | null;
}) {
  const t = useTranslations('donate');
  const [activeKey, setActiveKey] = useState<string | null>(initialEvent ? `events:${initialEvent}` : null);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    setActiveKey((prev) => (prev === key ? null : key));
  }, []);

  const handleAdd = useCallback(
    (catKey: string, catTitle: string, c: Cause, amount: number) => {
      onAdd({
        category: catKey,
        categoryTitle: catTitle,
        fundKey: c.fundKey,
        label: c.label,
        campaignSlug: c.campaignSlug,
        amount,
      });
      setAdded((p) => ({ ...p, [`${catKey}:${c.fundKey}`]: true }));
      setActiveKey(null);
    },
    [onAdd],
  );

  return (
    <div className="space-y-8">
      {CATEGORIES.map((cat) => {
        const catTitle = t(`categories.${cat.key}.title`);
        const causes: Cause[] =
          cat.key === 'events'
            ? EVENTS.map((ev) => {
                const live = liveBySlug.get(ev.id);
                const raised = live ? live.receivedAmount : ev.raisedAmount;
                const goal = live ? live.targetAmount : ev.goalAmount;
                const pct = fundedPercent(raised, goal);
                return {
                  fundKey: ev.id,
                  label: t(`events.${ev.id}.title`),
                  long: t(`events.${ev.id}.long`),
                  examples: t.raw(`events.${ev.id}.examples`) as string[],
                  impact: '',
                  image: EVENT_IMAGE[ev.id] ?? cat.image,
                  campaignSlug: ev.id,
                  funding: { raised, goal, pct, funded: pct >= 100, badge: badgeClass(ev.tone), type: t(`events.${ev.id}.type`) },
                };
              })
            : (SUBFUNDS[cat.key] ?? []).map((sf) => ({
                fundKey: sf.key,
                label: t(`funds.${cat.key}.${sf.key}.label`),
                long: t(`funds.${cat.key}.${sf.key}.long`),
                examples: t.raw(`funds.${cat.key}.${sf.key}.examples`) as string[],
                impact: t(`funds.${cat.key}.${sf.key}.impact`),
                image: sf.image,
                campaignSlug: null,
              }));

        return (
          <section key={cat.key}>
            {/* Category banner */}
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5">
              <Image src={cat.image} alt="" fill className="object-cover object-center" sizes="(min-width: 1024px) 680px, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-r from-rmc-green-deep/95 via-rmc-green-deep/80 to-rmc-green-deep/45 rtl:bg-gradient-to-l" />
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-15" />
              <div className="relative flex items-start gap-3.5 p-5 sm:p-6">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneChip(cat.tone, true)}`}>
                  <cat.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{catTitle}</h3>
                  <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/80">{t(`categories.${cat.key}.long`)}</p>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-rmc-gold-light ring-1 ring-white/15">
                    <Sparkles className="h-3 w-3" />
                    {t(`categories.${cat.key}.impact`)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cause cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {causes.map((c) => {
                const key = `${cat.key}:${c.fundKey}`;
                return (
                  <CauseCard
                    key={key}
                    cause={c}
                    currency={currency}
                    active={activeKey === key}
                    wasAdded={!!added[key]}
                    onToggle={() => toggle(key)}
                    onAdd={(amount) => handleAdd(cat.key, catTitle, c, amount)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ── A single descriptive cause card with inline add ── */
function CauseCard({
  cause,
  currency,
  active,
  wasAdded,
  onToggle,
  onAdd,
}: {
  cause: Cause;
  currency: string;
  active: boolean;
  wasAdded: boolean;
  onToggle: () => void;
  onAdd: (amount: number) => void;
}) {
  const t = useTranslations('donate');
  const [amount, setAmount] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const onAmount = useCallback((n: number) => setAmount(n), []);
  const f = cause.funding;

  const add = () => {
    if (amount <= 0) return;
    onAdd(amount);
    setResetKey((k) => k + 1);
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 transition-all duration-300 ${
        active ? 'border-rmc-green ring-rmc-green/30' : 'border-gray-100 ring-black/5 hover:border-rmc-green/40'
      }`}
    >
      {/* Image */}
      <div className="relative h-40 w-full">
        <Image src={cause.image} alt="" fill className="object-cover object-center" sizes="(min-width: 1024px) 320px, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {f && <span className={`absolute left-3 top-3 rtl:left-auto rtl:right-3 ${f.badge}`}>{f.type}</span>}
        {wasAdded && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rmc-green px-2.5 py-1 text-[10px] font-bold text-white shadow-sm rtl:right-auto rtl:left-3">
            <Check className="h-3 w-3" /> {t('card.added')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h4 className="text-[15px] font-bold leading-snug text-gray-900">{cause.label}</h4>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{cause.long}</p>

        {/* Example uses */}
        {cause.examples.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {cause.examples.map((ex) => (
              <span key={ex} className="rounded-full bg-rmc-green-light/70 px-2 py-0.5 text-[10.5px] font-semibold text-rmc-green-dark">
                {ex}
              </span>
            ))}
          </div>
        )}

        {/* Impact stat or funding bar */}
        {f ? (
          <div className="mt-3">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-bold tabular-nums text-gray-900">
                RWF {formatMoney(f.raised)}
                <span className="font-medium text-gray-400"> / {formatMoney(f.goal)}</span>
              </span>
              <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${f.funded ? 'text-[#8A6A0F]' : 'text-rmc-green'}`}>
                {f.funded && <CheckCircle2 className="h-3 w-3" />}
                {f.pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${f.funded ? 'bg-rmc-gold-light' : 'bg-rmc-green'}`} style={{ width: `${f.pct}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-rmc-green">
            <Sparkles className="h-3 w-3 shrink-0" />
            {cause.impact}
          </p>
        )}

        {/* Add control */}
        <div className="mt-4 pt-1">
          {active ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <p className="mb-2 text-[11.5px] text-gray-500">{t('card.howMuch', { fund: cause.label })}</p>
              <AmountPicker key={resetKey} currency={currency} onAmount={onAmount} />
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={add}
                  disabled={amount <= 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-rmc-green px-4 py-2 text-[13px] font-bold text-white transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('card.add')} {amount > 0 ? money(currency, amount) : ''}
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label={t('card.cancel')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-rmc-green/30 px-4 py-2 text-[13px] font-bold text-rmc-green transition-all duration-300 hover:bg-rmc-green hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {wasAdded ? t('card.addAgain') : t('card.addToGift')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

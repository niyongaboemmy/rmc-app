'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, Plus, CheckCircle2, X, Sparkles, HandHeart } from 'lucide-react';
import { fundedPercent, formatMoney, type PublicCampaignLike } from './eventsBridge';
import { toneChip, money, type CartItem } from './donateData';
import { resolveIcon } from './categoryIcons';
import type { PublicCategory } from '@/lib/donationCategoriesApi';
import type { PublicCampaign } from '@/lib/donationsApi';
import { fileUrl } from '@/lib/api';
import { AmountPicker } from './AmountPicker';

/** Resolve a program hero image (file-server key, or a pass-through URL/path). */
function resolveImg(v: string): string {
  return /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);
}

type NewItem = Omit<CartItem, 'id'>;

/* Funding figures shown on cause cards linked to a live campaign. */
interface Funding {
  raised: number;
  goal: number;
  pct: number;
  funded: boolean;
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
  categories,
  currency,
  liveBySlug,
  campaigns,
  onAdd,
  initialEvent,
}: {
  categories: PublicCategory[];
  currency: string;
  liveBySlug: Map<string, PublicCampaignLike>;
  campaigns: PublicCampaign[];
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

  // Group programs (campaigns) by the sub-fund they belong to; programs without a
  // sub-fund fall back to their category (fundType key).
  const programsBySubFundId = new Map<string, PublicCampaign[]>();
  const programsByCatKey = new Map<string, PublicCampaign[]>();
  for (const p of campaigns) {
    const bucket = p.subFundId ? programsBySubFundId : programsByCatKey;
    const k = p.subFundId ?? p.fundType;
    const list = bucket.get(k);
    if (list) list.push(p); else bucket.set(k, [p]);
  }

  const programToCause = (p: PublicCampaign): Cause => {
    const pct = fundedPercent(p.receivedAmount, p.targetAmount);
    return {
      fundKey: p.slug,
      label: p.title,
      long: p.description,
      examples: [],
      impact: '',
      image: p.heroImageUrl ? resolveImg(p.heroImageUrl) : '',
      campaignSlug: p.slug,
      funding: { raised: p.receivedAmount, goal: p.targetAmount, pct, funded: pct >= 100 },
    };
  };

  // A program records its own category in `fundType`; catTitle is display-only.
  const handleAddProgram = (p: PublicCampaign, amount: number, catTitle?: string) => {
    onAdd({ category: p.fundType, categoryTitle: catTitle ?? p.fundType, fundKey: p.slug, label: p.title, campaignSlug: p.slug, amount });
    setAdded((prev) => ({ ...prev, [`prog:${p.slug}`]: true }));
    setActiveKey(null);
  };

  const renderProgramCards = (progs: PublicCampaign[], catTitle?: string) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {progs.map((p) => {
        const key = `prog:${p.slug}`;
        return (
          <CauseCard
            key={key}
            cause={programToCause(p)}
            currency={currency}
            active={activeKey === key}
            wasAdded={!!added[key]}
            onToggle={() => toggle(key)}
            onAdd={(amount) => handleAddProgram(p, amount, catTitle)}
          />
        );
      })}
    </div>
  );

  // Programs the category/sub-fund grouping below won't place anywhere (their
  // category isn't shown, or they're category-level under "general") — surfaced
  // in a fallback section so no active program is ever hidden from donors.
  const shownCatKeys = new Set(categories.map((c) => c.key));
  const shownSubFundIds = new Set(categories.flatMap((c) => c.subfunds.map((s) => s.id)));
  const isPlaced = (p: PublicCampaign) =>
    p.subFundId ? shownSubFundIds.has(p.subFundId) : shownCatKeys.has(p.fundType);
  const unplacedPrograms = campaigns.filter((p) => !isPlaced(p));

  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const catTitle = cat.title;
        const Icon = resolveIcon(cat.icon);
        const causes: Cause[] = cat.subfunds.map((sf) => {
          const live = sf.campaignSlug ? liveBySlug.get(sf.campaignSlug) : undefined;
          const funding: Funding | undefined = live
            ? {
                raised: live.receivedAmount,
                goal: live.targetAmount,
                pct: fundedPercent(live.receivedAmount, live.targetAmount),
                funded: fundedPercent(live.receivedAmount, live.targetAmount) >= 100,
              }
            : undefined;
          return {
            fundKey: sf.key,
            label: sf.label,
            long: sf.long,
            examples: sf.examples ?? [],
            impact: sf.impact,
            image: sf.image || cat.image || '',
            campaignSlug: sf.campaignSlug,
            funding,
          };
        });

        return (
          <section key={cat.key}>
            {/* Category banner */}
            <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5">
              {cat.image && <Image src={cat.image} alt="" fill className="object-cover object-center" sizes="(min-width: 1024px) 680px, 100vw" />}
              <div className="absolute inset-0 bg-gradient-to-r from-rmc-green-deep/95 via-rmc-green-deep/80 to-rmc-green-deep/45 rtl:bg-gradient-to-l" />
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-15" />
              <div className="relative flex items-start gap-3.5 p-5 sm:p-6">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneChip(cat.tone === 'gold' ? 'gold' : 'green', true)}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{catTitle}</h3>
                  {cat.long && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/80">{cat.long}</p>}
                  {cat.impact && (
                    <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-rmc-gold-light ring-1 ring-white/15">
                      <Sparkles className="h-3 w-3" />
                      {cat.impact}
                    </span>
                  )}
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

            {/* Programs grouped under their sub-fund, then category-level programs. */}
            {cat.subfunds.map((sf) => {
              const progs = programsBySubFundId.get(sf.id);
              if (!progs?.length) return null;
              return (
                <div key={`progs-${sf.id}`} className="mt-5">
                  <h4 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                    {t('programsLabel')} · {sf.label}
                  </h4>
                  {renderProgramCards(progs, catTitle)}
                </div>
              );
            })}
            {(programsByCatKey.get(cat.key)?.length ?? 0) > 0 && (
              <div className="mt-5">
                <h4 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-gray-400">
                  {t('programsLabel')}
                </h4>
                {renderProgramCards(programsByCatKey.get(cat.key)!, catTitle)}
              </div>
            )}
          </section>
        );
      })}

      {/* Programs not tied to a shown category/sub-fund — still donor-visible. */}
      {unplacedPrograms.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-gray-900">{t('programsLabel')}</h3>
          {renderProgramCards(unplacedPrograms)}
        </section>
      )}
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
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rmc-green/5 ${
        active ? 'border-rmc-green ring-rmc-green/30' : 'border-gray-100 ring-black/5 hover:border-rmc-green/40'
      }`}
    >
      {/* Image (or patterned fallback for programs with no hero image) */}
      <div className="relative h-40 w-full overflow-hidden bg-rmc-green-light">
        {cause.image ? (
          <Image
            src={cause.image}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-105"
            sizes="(min-width: 1024px) 320px, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rmc-green to-rmc-green-deep">
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" />
            <HandHeart className="relative h-10 w-10 text-white/40 transition-transform duration-500 motion-safe:group-hover:scale-110" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {wasAdded && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rmc-green/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm rtl:right-auto rtl:left-3">
            <Check className="h-3 w-3" /> {t('card.added')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h4 className="text-[15px] font-bold leading-snug text-gray-900 transition-colors duration-300 group-hover:text-rmc-green">{cause.label}</h4>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{cause.long}</p>

        {/* Example uses */}
        {cause.examples.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {cause.examples.map((ex) => (
              <span key={ex} className="rounded-full bg-rmc-green-light/70 px-2 py-0.5 text-[10.5px] font-semibold text-rmc-green-dark ring-1 ring-rmc-green/10">
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
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  f.funded ? 'bg-gradient-to-r from-rmc-gold to-rmc-gold-light' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark'
                }`}
                style={{ width: `${f.pct}%` }}
              />
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
              {t('card.addToGift')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

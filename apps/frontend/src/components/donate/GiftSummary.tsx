'use client';

import { useTranslations } from 'next-intl';
import { ShoppingBag, Trash2, ArrowRight, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { money, type CartItem } from './donateData';

/* Always-visible donation cart. Lives in the right column on desktop (sticky)
   and stacks below the categories on mobile. Shows the running gift, the
   chosen niyyah and the total; "Continue" opens the focused checkout drawer. */
export function GiftSummary({
  items,
  currency,
  total,
  niyyahLabel,
  onRemove,
  onCheckout,
  className = '',
}: {
  items: CartItem[];
  currency: string;
  total: number;
  niyyahLabel: string;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  className?: string;
}) {
  const t = useTranslations('donate');
  const empty = items.length === 0;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 ${className}`}
    >
      {/* Header */}
      <div className="relative flex items-center gap-2.5 bg-rmc-green-deep px-5 py-4 text-white">
        <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
        <ShoppingBag className="relative h-5 w-5 shrink-0 text-rmc-gold-light" />
        <div className="relative min-w-0">
          <h2 className="text-base font-bold leading-none">{t('cart.title')}</h2>
          {!empty && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rmc-gold-light/80">
              <Sparkles className="h-3 w-3" />
              {t('cart.intention', { niyyah: niyyahLabel })}
            </p>
          )}
        </div>
        {!empty && (
          <span className="relative ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-rmc-gold px-2 text-xs font-bold text-rmc-green-deep">
            {items.length}
          </span>
        )}
      </div>

      {/* Body */}
      {empty ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <p className="text-sm font-semibold text-gray-700">{t('cart.empty')}</p>
          <p className="mt-1 text-[12.5px] text-gray-400">{t('cart.emptyHint')}</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[24rem] space-y-2 overflow-y-auto px-4 py-4">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 ring-1 ring-black/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-gray-900">{it.label}</p>
                  <p className="text-[11px] text-gray-400">{it.categoryTitle}</p>
                </div>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-gray-900">
                  {money(currency, it.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  aria-label={t('cart.remove', { label: it.label })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-gray-500">{t('cart.total')}</span>
              <span className="text-2xl font-bold tabular-nums text-gray-900">{money(currency, total)}</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark"
            >
              {t('summary.continue')}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Lock className="h-3 w-3" />
              {t('cart.secure')}
            </p>
          </div>
        </>
      )}

      {/* Reassurance — always shown so the trust message is visible up-front */}
      <div className="flex items-start gap-3 border-t border-gray-100 bg-rmc-green-light/40 px-5 py-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rmc-green" />
        <p className="text-[12px] leading-relaxed text-gray-600">
          {t.rich('reassurance', { b: (c) => <span className="font-semibold text-gray-900">{c}</span> })}
        </p>
      </div>
    </div>
  );
}

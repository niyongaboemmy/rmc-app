'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { HandHeart, Plus } from 'lucide-react';
import { type CartItem } from './donateData';
import { AmountPicker } from './AmountPicker';

/* "Give to the general fund" card — a custom/preset amount straight to the
   general fund. The page-wide currency is set from the causes toolbar. */
export function QuickGive({
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
    <div className="overflow-hidden rounded-lg border border-rmc-green/15 bg-white shadow-sm ring-1 ring-black/5">
      {/* Accent header */}
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-rmc-green/10 bg-gradient-to-br from-rmc-green-light/70 via-rmc-green-light/30 to-white px-5 py-4">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-rmc-gold/10 blur-2xl" />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rmc-green text-white shadow-sm shadow-rmc-green/30">
          <HandHeart className="h-5 w-5" />
        </span>
        <div className="relative min-w-0">
          <h2 className="text-[15px] font-bold leading-tight text-gray-900">{t('quickGive.title')}</h2>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{t('quickGive.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-3.5 p-5">
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

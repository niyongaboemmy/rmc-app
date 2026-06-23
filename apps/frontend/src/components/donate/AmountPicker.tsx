'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CURRENCIES, money } from './donateData';

/* Preset chips + custom input. Self-contained: it owns the preset/custom
   choice and reports the resolved numeric amount up via onAmount.
   Remount with a `key` to reset it after adding to the cart. */
export function AmountPicker({
  currency,
  onAmount,
  defaultPreset = 1,
}: {
  currency: string;
  onAmount: (n: number) => void;
  defaultPreset?: number;
}) {
  const t = useTranslations('donate');
  const presets = CURRENCIES[currency]?.presets ?? [];
  const [preset, setPreset] = useState<number | null>(presets[defaultPreset] ?? presets[0] ?? null);
  const [custom, setCustom] = useState('');

  const amount = custom.trim() ? Math.max(0, Math.floor(Number(custom) || 0)) : preset ?? 0;
  useEffect(() => {
    onAmount(amount);
  }, [amount, onAmount]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((p) => {
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
              className={`rounded-xl border py-2.5 text-[13px] font-bold tabular-nums transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green ${
                active
                  ? 'border-rmc-green bg-rmc-green text-white shadow-sm'
                  : 'border-gray-200 text-gray-700 hover:border-rmc-green/40 hover:bg-rmc-green-light/20'
              }`}
            >
              {money(currency, p)}
            </button>
          );
        })}
      </div>
      <div
        className={`mt-2 flex items-center overflow-hidden rounded-xl border bg-white transition-colors ${
          custom.trim() ? 'border-rmc-green ring-1 ring-rmc-green/30' : 'border-gray-200'
        }`}
      >
        <span className="select-none border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-bold text-gray-500">
          {CURRENCIES[currency]?.symbol}
        </span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder={t('card.customAmount')}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-[13px] font-semibold tabular-nums text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

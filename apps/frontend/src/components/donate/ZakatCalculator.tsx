'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calculator, Plus, Info } from 'lucide-react';
import { CURRENCIES, money, type CartItem } from './donateData';

type NewItem = Omit<CartItem, 'id'>;

/* A simple, transparent Zakat estimator. Zakat is 2.5% of zakatable
   wealth held above the Nisab for a lunar year. Inputs are manual so
   the donor stays in control; the Nisab is pre-filled but editable. */
export function ZakatCalculator({
  currency,
  onAddZakat,
}: {
  currency: string;
  onAddZakat: (item: NewItem) => void;
}) {
  const t = useTranslations('donate');
  const [savings, setSavings] = useState('');
  const [nisab, setNisab] = useState(String(CURRENCIES[currency]?.nisab ?? 0));
  const [added, setAdded] = useState(false);

  const sym = CURRENCIES[currency]?.symbol ?? '';
  const wealth = Math.max(0, Number(savings) || 0);
  const nisabVal = Math.max(0, Number(nisab) || 0);
  const eligible = wealth >= nisabVal && wealth > 0;
  const zakat = useMemo(() => (eligible ? Math.round(wealth * 0.025) : 0), [eligible, wealth]);

  const add = () => {
    if (zakat <= 0) return;
    onAddZakat({
      category: 'charity',
      categoryTitle: t('zakatItem.category'),
      fundKey: 'zakat',
      label: t('zakatItem.label'),
      campaignSlug: null,
      amount: zakat,
    });
    setAdded(true);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-rmc-gold/25 bg-white shadow-sm ring-1 ring-rmc-gold/10">
      <div className="relative flex items-center gap-3 bg-gradient-to-r from-[#8A6A0F] to-rmc-gold px-5 py-4 text-white">
        <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <Calculator className="h-5 w-5" />
        </span>
        <div className="relative">
          <h3 className="text-base font-bold leading-none">{t('zakat.title')}</h3>
          <p className="mt-1 text-[12px] text-white/80">{t('zakat.subtitle')}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('zakat.wealthLabel')} hint={t('zakat.wealthHint')}>
            <MoneyInput sym={sym} value={savings} onChange={setSavings} placeholder={t('zakat.wealthPlaceholder')} />
          </Field>
          <Field label={t('zakat.nisabLabel')} hint={t('zakat.nisabHint')}>
            <MoneyInput sym={sym} value={nisab} onChange={setNisab} placeholder={t('zakat.nisabPlaceholder')} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rmc-gold/5 px-4 py-3.5 ring-1 ring-rmc-gold/15">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A6A0F]">{t('zakat.yourZakat')}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{money(currency, zakat)}</p>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={zakat <= 0}
            className="flex items-center justify-center gap-2 rounded-full bg-[#8A6A0F] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {added ? t('zakat.addedAgain') : t('zakat.addZakat')}
          </button>
        </div>

        {!eligible && wealth > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-gray-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            {t('zakat.belowNisab')}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{t('zakat.disclaimer')}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-bold text-gray-700">{label}</label>
      {children}
      <p className="mt-1 text-[11px] leading-snug text-gray-400">{hint}</p>
    </div>
  );
}

function MoneyInput({
  sym,
  value,
  onChange,
  placeholder,
}: {
  sym: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors focus-within:border-rmc-gold focus-within:ring-1 focus-within:ring-rmc-gold/30">
      <span className="select-none border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-bold text-gray-500">{sym}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent px-3 py-2.5 text-[13px] font-semibold tabular-nums text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-300"
      />
    </div>
  );
}

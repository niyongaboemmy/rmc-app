'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Trash2, Lock, Repeat, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { METHODS, money, type CartItem } from './donateData';

export function CartDrawer({
  open,
  onClose,
  items,
  currency,
  total,
  niyyahLabel,
  recurring,
  setRecurring,
  method,
  setMethod,
  name,
  setName,
  email,
  setEmail,
  anonymous,
  setAnonymous,
  onRemove,
  onCheckout,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  currency: string;
  total: number;
  niyyahLabel: string;
  recurring: boolean;
  setRecurring: (v: boolean) => void;
  method: string;
  setMethod: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  anonymous: boolean;
  setAnonymous: (v: boolean) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  submitting: boolean;
  error: string;
}) {
  const t = useTranslations('donate');

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const empty = items.length === 0;

  return (
    <div className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your donation cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between bg-rmc-green-deep px-5 py-4 text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
          <div className="relative flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-rmc-gold-light" />
            <h2 className="text-base font-bold">{t('cart.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cart.close')}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Niyyah chip */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-rmc-gold/10 px-3 py-1 text-[11.5px] font-bold text-[#8A6A0F] ring-1 ring-rmc-gold/20">
            <Sparkles className="h-3.5 w-3.5" />
            {t('cart.intention', { niyyah: niyyahLabel })}
          </div>

          {empty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                <ShoppingBag className="h-7 w-7" />
              </span>
              <p className="text-sm font-semibold text-gray-700">{t('cart.empty')}</p>
              <p className="mt-1 text-[12.5px] text-gray-400">{t('cart.emptyHint')}</p>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 ring-1 ring-black/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-gray-900">{it.label}</p>
                      <p className="text-[11px] text-gray-400">{it.categoryTitle}</p>
                    </div>
                    <span className="shrink-0 text-[13.5px] font-bold tabular-nums text-gray-900">{money(currency, it.amount)}</span>
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

              {/* Recurring */}
              <button
                type="button"
                onClick={() => setRecurring(!recurring)}
                aria-pressed={recurring}
                className={`mt-4 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                  recurring ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${recurring ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Repeat className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-gray-900">{t('cart.monthly')}</span>
                  <span className="block text-[11.5px] text-gray-400">{t('cart.monthlyHint')}</span>
                </span>
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${recurring ? 'bg-rmc-green' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${recurring ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>

              {/* Donor details */}
              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('cart.yourDetails')}</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={anonymous}
                  placeholder={anonymous ? t('cart.anonName') : t('cart.namePlaceholder')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13.5px] text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('cart.emailPlaceholder')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13.5px] text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                />
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-rmc-green accent-rmc-green"
                  />
                  {t('cart.giveAnon')}
                </label>
              </div>

              {/* Payment method */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('cart.paymentMethod')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map(({ key, Icon }) => {
                    const active = method === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMethod(key)}
                        aria-pressed={active}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 ${
                          active ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-rmc-green' : 'text-gray-400'}`} />
                        <span className="text-[11px] font-bold leading-tight text-gray-900">{t(`methods.${key}.title`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!empty && (
          <div className="border-t border-gray-100 bg-white px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-gray-500">{t('cart.total')} {recurring && <span className="text-gray-400">{t('cart.perMonth')}</span>}</span>
              <span className="text-2xl font-bold tabular-nums text-gray-900">{money(currency, total)}</span>
            </div>
            {error && <p className="mb-2.5 text-center text-[12px] font-medium text-red-600">{error}</p>}
            <button
              type="button"
              onClick={onCheckout}
              disabled={submitting || total <= 0}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t('cart.processing') : t('cart.complete')}
              {!submitting && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Lock className="h-3 w-3" />
              {t('cart.secure')}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

'use client';

/**
 * Compact "how much?" modal shown when a donor clicks Donate on a campaign card
 * or the featured block. It reuses the existing `AmountPicker` and simply routes
 * the chosen amount into the existing donation cart — "Add to cart" keeps
 * browsing, "Donate now" adds and opens checkout (the CartDrawer payment engine).
 * No payment logic lives here.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import type { PublicCampaign } from '@/lib/donationsApi';
import { AmountPicker } from './AmountPicker';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export function DonateModal({
  campaign,
  currency,
  onClose,
  onAdd,
}: {
  campaign: PublicCampaign | null;
  currency: string;
  onClose: () => void;
  /** Adds the amount to the cart; `checkout` also opens the checkout drawer. */
  onAdd: (campaign: PublicCampaign, amount: number, checkout: boolean) => void;
}) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (campaign) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [campaign, onClose]);

  if (!campaign) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-rmc-green via-rmc-green-light to-rmc-green" />
          <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rmc-gold">Your donation</p>
              <h2 className="mt-0.5 line-clamp-2 text-base font-bold leading-snug text-gray-900">
                {campaign.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-6 pb-6">
            <AmountPicker key={`${campaign.id}-${currency}`} currency={currency} onAmount={setAmount} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={amount <= 0}
                onClick={() => onAdd(campaign, amount, false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" /> Add to cart
              </button>
              <button
                type="button"
                disabled={amount <= 0}
                onClick={() => onAdd(campaign, amount, true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Donate now <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

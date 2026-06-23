'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CartItem } from '@/components/donate/donateData';

/* ──────────────────────────────────────────────────────────────
   Donation cart — the donor's in-progress pledges BEFORE checkout.

   Lives above the page (mounted in the locale layout) and persists
   to localStorage, so the cart survives route changes AND full page
   reloads. It is cleared on a successful checkout, when the currency
   changes (line items are in the old currency), or when the saved
   cart ages past TTL_MS.

   Note: donor PII (name / email) is deliberately NOT persisted here —
   those stay as ephemeral state in the donate page.
   ────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'rmc_donation_cart';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_CURRENCY = 'RWF';
const DEFAULT_NIYYAH = 'sadaqah';

interface PersistedCart {
  cart: CartItem[];
  currency: string;
  niyyah: string;
  seq: number;
  expiresAt: number;
}

interface DonationCartValue {
  cart: CartItem[];
  currency: string;
  niyyah: string;
  total: number;
  /** True once localStorage has been read (after first mount). */
  hydrated: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  /** Empty the cart (used after a successful checkout). */
  clear: () => void;
  /** Switching currency clears the cart — line items are in the old currency. */
  setCurrency: (currency: string) => void;
  setNiyyah: (niyyah: string) => void;
}

const DonationCartContext = createContext<DonationCartValue>({
  cart: [],
  currency: DEFAULT_CURRENCY,
  niyyah: DEFAULT_NIYYAH,
  total: 0,
  hydrated: false,
  addItem: () => {},
  removeItem: () => {},
  clear: () => {},
  setCurrency: () => {},
  setNiyyah: () => {},
});

export function DonationCartProvider({ children }: { children: React.ReactNode }) {
  // Start from defaults so the server and the first client render agree
  // (localStorage is unavailable on the server). Real values are loaded in
  // the effect below, after mount, to avoid a hydration mismatch.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [niyyah, setNiyyah] = useState(DEFAULT_NIYYAH);
  const seqRef = useRef(1);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedCart;
        if (saved && typeof saved.expiresAt === 'number' && saved.expiresAt > Date.now()) {
          setCart(Array.isArray(saved.cart) ? saved.cart : []);
          if (saved.currency) setCurrencyState(saved.currency);
          if (saved.niyyah) setNiyyah(saved.niyyah);
          if (typeof saved.seq === 'number') seqRef.current = saved.seq;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Corrupt/old payload — start fresh.
    }
    setHydrated(true);
  }, []);

  // Persist on every change (but not before hydration, or we'd clobber the
  // saved cart with the empty defaults from the initial render).
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const payload: PersistedCart = {
        cart,
        currency,
        niyyah,
        seq: seqRef.current,
        expiresAt: Date.now() + TTL_MS,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full / unavailable — degrade to in-memory only.
    }
  }, [cart, currency, niyyah, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = `i${seqRef.current}`;
    seqRef.current += 1;
    setCart((prev) => [...prev, { ...item, id }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const setCurrency = useCallback(
    (next: string) => {
      setCurrencyState((cur) => {
        if (next !== cur) setCart([]);
        return next;
      });
    },
    [],
  );

  const total = cart.reduce((sum, it) => sum + it.amount, 0);

  return (
    <DonationCartContext.Provider
      value={{ cart, currency, niyyah, total, hydrated, addItem, removeItem, clear, setCurrency, setNiyyah }}
    >
      {children}
    </DonationCartContext.Provider>
  );
}

export const useDonationCart = () => useContext(DonationCartContext);

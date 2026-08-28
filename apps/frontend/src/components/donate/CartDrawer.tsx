'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  X, Trash2, Lock, Repeat, ShoppingBag, ArrowRight, Sparkles,
  Smartphone, Loader2, AlertCircle, RefreshCw, CheckCircle2,
  CreditCard, Landmark, Wallet,
} from 'lucide-react';
import { PhoneInput, toE164 } from '@/components/ui/PhoneInput';
import { cn } from '@/lib/utils';
import { paymentSettingsApi } from '@/lib/paymentSettingsApi';
import { IremboPayWidget } from '@/components/payments/IremboPayWidget';
import { IremboInvoiceHandle } from '@/hooks/useIremboPayment';
import { money, type CartItem } from './donateData';
import { donationsApi } from '@/lib/donationsApi';
import { buildDonationMessage } from '@/lib/donationMeta';
import type { DonationSummary } from './SuccessState';

type Phase = 'form' | 'waiting' | 'timeout' | 'failed';

/**
 * What the payer can actually use, as offered by IremboPay's own sheet. This is
 * a label list, not a picker: the gateway owns the choice, so a hard-coded
 * selector here could only drift out of date against it.
 */
const ACCEPTED_METHODS = [
  'MTN MoMo',
  'Airtel Money',
  'Visa',
  'Mastercard',
  'Bank transfer',
  'Digital banking',
];

const DISABLED_METHODS = ['bank', 'paypal'];

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  momo: Smartphone,
  card: CreditCard,
  bank: Landmark,
  paypal: Wallet,
};

const METHOD_LABELS: Record<string, string> = {
  momo: 'Mobile Money',
  card: 'Card',
  bank: 'Bank Transfer',
  paypal: 'PayPal',
};

// ── Animated success popup (portal) ──────────────────────────────────────────

function ConfirmedPopup({
  total,
  currency,
  donorName,
  onContinue,
}: {
  total: number;
  currency: string;
  donorName?: string;
  onContinue: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(20);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); onContinue(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onContinue]);

  const sparkles = Array.from({ length: 8 }, (_, i) => i);
  const circumference = 2 * Math.PI * 28;
  const progress = (countdown / 20) * circumference;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { transform:scale(0.6); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes checkDraw { to { stroke-dashoffset: 0 } }
        @keyframes sparkle { 0%,100% { opacity:0; transform:scale(0) translate(0,0) } 20%,80% { opacity:1; transform:scale(1) } }
        @keyframes ripple { 0% { transform:scale(0.8); opacity:0.6 } 100% { transform:scale(2.4); opacity:0 } }
        .pop-card { animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both }
        .check-path { stroke-dasharray:50; stroke-dashoffset:50; animation: checkDraw 0.5s 0.3s ease forwards }
        .sparkle-dot { animation: sparkle 1.2s ease infinite }
        .ripple-ring { animation: ripple 1.8s ease-out infinite }
      `}</style>

      <div className="pop-card relative mx-4 w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-2xl">
        {/* Ripple rings */}
        <div className="pointer-events-none absolute left-1/2 top-[4.5rem] -translate-x-1/2 -translate-y-1/2">
          {[0, 0.6, 1.2].map((delay, i) => (
            <div
              key={i}
              className="ripple-ring absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rmc-green/30"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        {/* Animated checkmark */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          {/* Sparkle dots */}
          {sparkles.map((i) => {
            const angle = (i / 8) * 360;
            const rad = (angle * Math.PI) / 180;
            const r = 52;
            const x = 40 + r * Math.cos(rad);
            const y = 40 + r * Math.sin(rad);
            return (
              <div
                key={i}
                className="sparkle-dot absolute h-2 w-2 rounded-full bg-rmc-gold"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            );
          })}

          {/* Countdown ring + check */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#E8F5EE" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="28"
              fill="none" stroke="#1B5E38" strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
          </svg>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-light">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
              <path
                className="check-path"
                d="M5 13l4 4L19 7"
                stroke="#1B5E38"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <p className="mb-1 font-arabic text-2xl text-rmc-green-dark" dir="rtl">جَزَاكَ اللَّهُ خَيْرًا</p>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          {donorName ? `JazakAllah, ${donorName}!` : 'JazakAllah Khairan!'}
        </h2>
        <p className="mb-1 text-sm text-gray-500">Your donation of</p>
        <p className="mb-5 text-3xl font-bold tabular-nums text-rmc-green">{money(currency, total)}</p>
        <p className="mb-6 text-[13px] leading-relaxed text-gray-500">
          Payment confirmed. May Allah accept your generous gift and multiply it for you.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-lg bg-rmc-green py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark"
        >
          Continue — {countdown}s
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ── Waiting screen (inside drawer body) ──────────────────────────────────────

const POLL_INTERVAL_S = 3;
const MAX_POLL_ATTEMPTS = 30; // 90 seconds then show timeout state

function WaitingScreen({
  phone,
  total,
  currency,
  checkCount,
  onCancel,
  onResend,
  isResending,
  error,
}: {
  phone: string;
  total: number;
  currency: string;
  /** Incremented by the parent each time a real gateway check fires. */
  checkCount: number;
  onCancel: () => void;
  onResend: () => void;
  isResending: boolean;
  error?: string;
}) {
  const [countdown, setCountdown] = useState(POLL_INTERVAL_S);
  const [isChecking, setIsChecking] = useState(false);

  // Reset countdown and briefly flash "Checking…" each time a real check fires
  useEffect(() => {
    setIsChecking(true);
    setCountdown(POLL_INTERVAL_S);
    const t = setTimeout(() => setIsChecking(false), 900);
    return () => clearTimeout(t);
  }, [checkCount]);

  // Tick down every second between checks
  useEffect(() => {
    if (isChecking) return;
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isChecking]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
      {/* Pulse animation */}
      <div className="relative mb-8">
        {[0, 0.5, 1].map((delay, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full bg-rmc-green/20 animate-ping"
            style={{ animationDelay: `${delay}s`, animationDuration: '2s' }}
          />
        ))}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rmc-green-light ring-4 ring-rmc-green/20">
          <Smartphone className="h-9 w-9 text-rmc-green" />
        </div>
      </div>

      <h3 className="mb-2 text-lg font-bold text-gray-900">Approve on your phone</h3>
      <p className="mb-1 text-sm text-gray-600">
        A payment request of <span className="font-bold text-gray-900">{money(currency, total)}</span> has been sent to:
      </p>
      <p className="mb-5 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-bold tabular-nums text-gray-800">
        {phone}
      </p>

      {/* Live status indicator */}
      <div className={`mb-5 flex items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors duration-300 ${
        isChecking
          ? 'border-rmc-green/30 bg-rmc-green-light/50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <Loader2 className={`h-4 w-4 shrink-0 animate-spin ${isChecking ? 'text-rmc-green' : 'text-amber-500'}`} />
        <p className={`text-[12.5px] font-medium ${isChecking ? 'text-rmc-green-dark' : 'text-amber-700'}`}>
          {isChecking
            ? 'Checking payment status…'
            : countdown > 0
              ? `Checking again in ${countdown}s…`
              : 'Checking payment status…'}
        </p>
      </div>

      <p className="mb-5 text-[12px] text-gray-400">
        Approve the MoMo prompt on your phone — this page will update automatically.
      </p>

      {error && (
        <div className="mb-4 flex w-full items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-left">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-[12.5px] text-red-600">{error}</p>
        </div>
      )}

      <div className="flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onResend}
          disabled={isResending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rmc-green px-4 py-2.5 text-sm font-bold text-rmc-green transition-colors hover:bg-rmc-green-light/50 disabled:opacity-50"
        >
          {isResending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Resend payment request
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-400 underline-offset-2 transition-colors hover:text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function CartDrawer({
  open,
  onClose,
  items,
  currency,
  total,
  niyyahLabel,
  niyyah,
  locale,
  onRemove,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  currency: string;
  total: number;
  niyyahLabel: string;
  niyyah: string;
  locale: string;
  onRemove: (id: string) => void;
  onSuccess: (summary: DonationSummary) => void;
}) {
  const t = useTranslations('donate');

  // Donor form state
  const [recurring, setRecurring] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  // Payment flow
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [checkCount, setCheckCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [widgetSupported, setWidgetSupported] = useState(false);
  const [cardInvoice, setCardInvoice] = useState<IremboInvoiceHandle | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  // Whether card/bank is on offer is the gateway's answer, not ours: a gateway
  // with no hosted widget — or none configured at all — must not show a card
  // option the payer cannot actually complete.
  useEffect(() => {
    let alive = true;
    paymentSettingsApi
      .getPublicPaymentConfig()
      .then((c) => alive && setWidgetSupported(c.supportsWidget))
      .catch(() => alive && setWidgetSupported(false));
    return () => {
      alive = false;
    };
  }, []);

  // Lock body scroll while drawer is open
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

  // Stop polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const startPolling = useCallback((ids: string[]) => {
    stopPolling();
    let remaining = [...ids];
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      setCheckCount((c) => c + 1);
      const results = await Promise.all(remaining.map((id) => donationsApi.checkStatus(id).catch(() => null)));
      const next: string[] = [];
      let anyFailed = false;
      results.forEach((d, i) => {
        if (!d || d.status === 'pending') next.push(remaining[i]);
        else if (d.status === 'failed') anyFailed = true;
      });
      remaining = next;

      if (remaining.length === 0) {
        stopPolling();
        if (anyFailed) {
          setPhase('failed');
          setError('Payment failed. Please check your MoMo balance and try again.');
        } else {
          setShowPopup(true);
        }
      } else if (anyFailed) {
        stopPolling();
        setPhase('failed');
        setError('Payment failed. Please check your MoMo balance and try again.');
      } else if (attempts >= MAX_POLL_ATTEMPTS) {
        // The gateway hasn't resolved in 90s — show the timeout state.
        // The backend reconciliation job updates the record when it does.
        stopPolling();
        setPhase('timeout');
      }
    };

    pollingRef.current = setInterval(tick, POLL_INTERVAL_S * 1000);
    tick();
  }, []);

  /**
   * The basket as API payloads. Shared by checkout and resend so they cannot drift.
   *
   * `channel` labels how the basket is actually paid. It used to be hard-coded
   * to `'momo'` even on the card path, which recorded every card donation as a
   * MoMo one — and left the backend deciding the payment route from a value the
   * card flow never meant.
   */
  const buildCartItems = useCallback(
    (e164Phone: string, channel: 'momo' | 'card' = 'momo') =>
      items.map((it) => ({
        campaignSlug: it.campaignSlug,
        amount: it.amount,
        currency,
        frequency: (recurring ? 'monthly' : 'once') as 'monthly' | 'once',
        paymentMethod: channel,
        donorName: anonymous ? undefined : name.trim() || undefined,
        donorEmail: email.includes('@') ? email.trim() : undefined,
        donorPhone: e164Phone,
        isAnonymous: anonymous,
        message: buildDonationMessage({ niyyah, category: it.category, fund: it.fundKey }),
      })),
    [items, currency, recurring, anonymous, name, email, niyyah],
  );

  const initiatePayment = useCallback(async () => {
    if (total <= 0 || submitting) return;
    if (!phone.trim()) { setError(t('cart.phoneRequired')); return; }

    setSubmitting(true);
    setError('');
    try {
      const e164Phone = toE164(phone.trim());
      // One payment for the whole basket: a single MoMo prompt rather than one
      // per item, and the only shape a card/bank widget can settle.
      const cart = await donationsApi.donateCart(buildCartItems(e164Phone), 'momo');
      const donations = cart.donations;

      const pending = donations.filter((d) => d.status === 'pending').map((d) => d.id);
      const anyImmediateFailure = donations.some((d) => d.status === 'failed' || d.status === 'refunded');

      setConfirmedTotal(total);
      setPendingIds(pending);
      setCheckCount(0);

      if (pending.length === 0) {
        if (anyImmediateFailure) {
          // Gateway rejected the payment immediately — show error, do not show success popup.
          setPhase('failed');
          setError(t('cart.error'));
        } else {
          // The gateway confirmed synchronously (or none is configured in dev).
          setShowPopup(true);
        }
      } else {
        setPhase('waiting');
        startPolling(pending);
      }
    } catch {
      setError(t('cart.error'));
    } finally {
      setSubmitting(false);
    }
  }, [total, submitting, phone, t, startPolling, buildCartItems]);

  /**
   * Checks out the basket for card/bank.
   *
   * Creates the same donations as the MoMo path but asks for no prompt; the
   * payer settles the single invoice in the hosted widget instead. Confirmation
   * still comes from the backend, never from the widget's callback.
   */
  const payByCard = useCallback(async () => {
    if (total <= 0 || cardBusy) return;
    setCardBusy(true);
    setError('');
    setPhase('form');
    try {
      const e164Phone = phone.trim() ? toE164(phone.trim()) : '';
      const cart = await donationsApi.donateCart(buildCartItems(e164Phone, 'card'), 'card');

      if (!cart.invoiceNumber) {
        setError('Payment is unavailable right now. Please try again shortly.');
        return;
      }
      setCardInvoice({
        transactionId: cart.transactionId,
        invoiceNumber: cart.invoiceNumber,
        publicKey: cart.publicKey ?? undefined,
        widgetScriptUrl: cart.widgetScriptUrl ?? undefined,
        paymentLinkUrl: cart.paymentLinkUrl ?? undefined,
      });
      setPendingIds(cart.donations.map((d) => d.id));
    } catch {
      setError(t('cart.error'));
    } finally {
      setCardBusy(false);
    }
  }, [total, cardBusy, phone, buildCartItems, t]);

  const handleResend = async () => {
    if (isResending || submitting) return;
    setIsResending(true);
    setPhase('waiting');
    setError('');
    stopPolling();
    try {
      // Re-create a fresh payment request by calling donate() again.
      // Old pending donation records stay in the DB but will never complete.
      const e164Phone = toE164(phone.trim());
      const cart = await donationsApi.donateCart(buildCartItems(e164Phone), 'momo');
      const donations = cart.donations;
      const pending = donations.filter((d) => d.status === 'pending').map((d) => d.id);
      const anyImmediateFailure = donations.some((d) => d.status === 'failed' || d.status === 'refunded');
      setPendingIds(pending);
      setCheckCount(0);
      if (pending.length === 0) {
        // Gateway rejected the resent request immediately — go back to form with error.
        setPhase('failed');
        setError(anyImmediateFailure ? 'Payment failed. Please check your MoMo number and try again.' : t('cart.error'));
      } else {
        setError('');
        startPolling(pending);
      }
    } catch {
      setError('Failed to resend payment request. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = () => {
    stopPolling();
    setPhase('form');
    setError('');
  };

  const handlePopupContinue = useCallback(() => {
    setShowPopup(false);
    stopPolling();

    const now = new Date();
    const summary: DonationSummary = {
      reference: `RMC-${now.getTime().toString(36).toUpperCase()}`,
      dateStr: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      items,
      currency,
      total: confirmedTotal,
      recurring,
      methodName: t('methods.momo.title'),
      niyyahLabel,
      pendingPaymentIds: [],
    };

    onSuccess(summary);
    onClose();
    setPhase('form');
    setPhone('');
    setName('');
    setEmail('');
    setAnonymous(false);
    setRecurring(false);
    setPendingIds([]);
  }, [items, currency, confirmedTotal, recurring, niyyahLabel, t, onSuccess, onClose]);

  const empty = items.length === 0;

  return (
    <>
      {showPopup && (
        <ConfirmedPopup
          total={confirmedTotal}
          currency={currency}
          donorName={anonymous ? undefined : name.trim() || undefined}
          onContinue={handlePopupContinue}
        />
      )}

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
          aria-label="Your donation gift"
          className={`absolute right-0 top-0 flex h-full w-full max-w-2xl lg:max-w-3xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between bg-rmc-green-deep px-5 py-4 text-white">
            <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" />
            <div className="relative flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-rmc-gold-light" />
                <h2 className="text-base font-bold">{t('cart.title')}</h2>
              </div>
              {!empty && (
                <div className="ml-8 inline-flex items-center gap-1 text-[11px] text-rmc-gold-light/80">
                  <Sparkles className="h-3 w-3" />
                  {t('cart.intention', { niyyah: niyyahLabel })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('cart.close')}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 overflow-y-auto">
            {/* Request-in-flight overlay */}
            {(submitting || isResending) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-rmc-green" />
                <p className="text-[13px] font-semibold text-rmc-green-dark">
                  {isResending ? 'Resending payment request…' : 'Sending payment request…'}
                </p>
              </div>
            )}
            {empty ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                  <ShoppingBag className="h-7 w-7" />
                </span>
                <p className="text-sm font-semibold text-gray-700">{t('cart.empty')}</p>
                <p className="mt-1 text-[12.5px] text-gray-400">{t('cart.emptyHint')}</p>
              </div>
            ) : phase === 'waiting' ? (
              <WaitingScreen
                phone={phone}
                total={total}
                currency={currency}
                checkCount={checkCount}
                onCancel={handleCancel}
                onResend={handleResend}
                isResending={isResending}
                error={error}
              />
            ) : phase === 'timeout' ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
                <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-4 ring-amber-100">
                  <Loader2 className="h-8 w-8 text-amber-500" />
                </span>
                <h3 className="mb-2 text-base font-bold text-gray-900">Still waiting for confirmation</h3>
                <p className="mb-1 text-sm text-gray-600">
                  Your payment of <span className="font-bold text-gray-900">{money(currency, confirmedTotal)}</span> is being processed.
                </p>
                <p className="mb-6 text-[12.5px] leading-relaxed text-gray-400">
                  MTN MoMo can take a few minutes to confirm. If you approved the prompt on your phone, your donation will be recorded automatically — you&apos;ll receive an SMS.
                </p>
                <div className="flex w-full flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rmc-green px-4 py-2.5 text-sm font-bold text-rmc-green transition-colors hover:bg-rmc-green-light/50 disabled:opacity-50"
                  >
                    {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Try again with a new request
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-medium text-gray-400 underline-offset-2 transition-colors hover:text-gray-600 hover:underline"
                  >
                    Close — I&apos;ll wait for the SMS
                  </button>
                </div>
              </div>
            ) : (
              /* ── Desktop: 2-col grid so all content is visible without scrolling ── */
              <div className="grid h-full grid-cols-1 content-start md:grid-cols-[minmax(0,1fr)_minmax(300px,1.05fr)] md:divide-x md:divide-gray-100">

                {/* LEFT: items + recurring + donor details */}
                <div className="px-5 py-4 space-y-4">
                  {/* Items */}
                  <div>
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">Your gift</p>
                    <ul className="space-y-2">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 ring-1 ring-black/5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-gray-900">{it.label}</p>
                            <p className="text-[11px] text-gray-400">{it.categoryTitle}</p>
                          </div>
                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-gray-900">{money(currency, it.amount)}</span>
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
                  </div>

                  {/* Recurring */}
                  <button
                    type="button"
                    onClick={() => setRecurring(!recurring)}
                    aria-pressed={recurring}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
                      recurring ? 'border-rmc-green bg-rmc-green-light/40 ring-1 ring-rmc-green/30' : 'border-gray-200 hover:border-rmc-green/40'
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${recurring ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Repeat className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-gray-900">{t('cart.monthly')}</span>
                      <span className="block text-[11px] text-gray-400">{t('cart.monthlyHint')}</span>
                    </span>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${recurring ? 'bg-rmc-green' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${recurring ? 'left-4' : 'left-0.5'}`} />
                    </span>
                  </button>

                  {/* Donor details */}
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('cart.yourDetails')}</p>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={anonymous}
                      placeholder={anonymous ? t('cart.anonName') : t('cart.namePlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[13px] text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('cart.emailPlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[13px] text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green"
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-gray-600">
                      <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-rmc-green"
                      />
                      {t('cart.giveAnon')}
                    </label>
                  </div>
                </div>

                {/* RIGHT: payment */}
                <div className="px-5 py-4 space-y-4">
                  {/*
                    IremboPay's own sheet already offers MTN, Airtel, card, bank,
                    cash and digital banking. Re-implementing a method picker in
                    front of it meant our list could only ever be a worse, staler
                    copy — with "Soon" badges for channels the gateway supports
                    today. So we show what is accepted and hand the choice over.
                  */}
                  {widgetSupported ? (
                    cardInvoice ? (
                      <IremboPayWidget
                        autoOpen
                        invoice={cardInvoice}
                        amount={total}
                        currency={currency}
                        checkStatus={(txn) =>
                          paymentSettingsApi.getPaymentStatus(txn).then((r) => r.status)
                        }
                        onConfirmed={() => setShowPopup(true)}
                      />
                    ) : (
                      <>
                        <div>
                          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            {t('cart.paymentMethod')}
                          </p>
                          <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/60 p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {ACCEPTED_METHODS.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                            <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
                              Choose how to pay on the next screen. Your whole basket is settled by
                              a single secure payment.
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Mobile number <span className="normal-case tracking-normal font-medium text-gray-300">— optional</span>
                          </p>
                          <PhoneInput
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            hint="For your receipt. You can also enter it on the payment screen."
                          />
                        </div>
                      </>
                    )
                  ) : (
                    <div>
                      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">Mobile number</p>
                      <PhoneInput
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        hint={t('cart.phoneHint')}
                      />
                    </div>
                  )}

                  {/* Error */}
                  {(error || phase === 'failed') && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-[12.5px] text-red-600">{error || t('cart.error')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!empty && phase !== 'waiting' && phase !== 'timeout' && !cardInvoice && (
            <div className="border-t border-gray-100 bg-white px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-gray-500">
                  {t('cart.total')} {recurring && <span className="text-gray-400">{t('cart.perMonth')}</span>}
                </span>
                <span className="text-2xl font-bold tabular-nums text-gray-900">{money(currency, total)}</span>
              </div>
              <button
                type="button"
                onClick={widgetSupported ? () => void payByCard() : initiatePayment}
                disabled={submitting || cardBusy || total <= 0}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting || cardBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('cart.processing')}
                  </>
                ) : (
                  <>
                    {/* No channel in the label: the payer picks it in the sheet. */}
                    Pay {money(currency, total)}
                    {!widgetSupported && ' with MoMo'}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
                  </>
                )}
              </button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <Lock className="h-3 w-3" />
                {t('cart.secure')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

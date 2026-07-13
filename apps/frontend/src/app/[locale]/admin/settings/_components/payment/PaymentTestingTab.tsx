'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone, Zap, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, AlertCircle, Activity, Wallet, X,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  paymentSettingsApi,
  PaymentMethod,
  PaymentType,
  PaymentTransaction,
  TestPaymentPayload,
  TestPaymentResult,
  TestDepositPayload,
} from '@/lib/paymentSettingsApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentCallbackEvent {
  type: 'payment.confirmed' | 'payment.failed' | 'payment.pending';
  requestTransactionId: string;
  transactionId: string;
  status: string;
  responseCode: string;
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:    { label: 'Pending',    icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  successful: { label: 'Successful', icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  failed:     { label: 'Failed',     icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['pending'];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', cfg.bg, cfg.color)}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('rw-RW').format(n) + ' RWF';
}

// ── Success Popup ─────────────────────────────────────────────────────────────

const POPUP_TIMEOUT = 60_000; // 1 minute

const SPARKLES = [
  { top: '8%',  left: '7%',   delay: '0s',    size: 8,  color: '#34d399' },
  { top: '12%', right: '9%',  delay: '0.15s', size: 6,  color: '#fbbf24' },
  { top: '22%', left: '4%',   delay: '0.3s',  size: 10, color: '#60a5fa' },
  { top: '4%',  left: '42%',  delay: '0.1s',  size: 7,  color: '#f472b6' },
  { top: '18%', right: '4%',  delay: '0.4s',  size: 9,  color: '#a78bfa' },
  { top: '68%', left: '5%',   delay: '0.2s',  size: 7,  color: '#34d399' },
  { top: '74%', right: '7%',  delay: '0.35s', size: 8,  color: '#fbbf24' },
  { top: '84%', left: '22%',  delay: '0.05s', size: 6,  color: '#60a5fa' },
  { top: '79%', right: '19%', delay: '0.25s', size: 10, color: '#f472b6' },
];

function PaymentSuccessPopup({
  event,
  onClose,
}: {
  event: PaymentCallbackEvent;
  onClose: () => void;
}) {
  const isSuccess = event.type === 'payment.confirmed';
  const [elapsed,  setElapsed]  = useState(0);
  const [entered,  setEntered]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const tick  = setInterval(() => setElapsed((e) => e + 250), 250);
    const timer = setTimeout(onClose, POPUP_TIMEOUT);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [onClose]);

  const progress  = Math.min(elapsed / POPUP_TIMEOUT, 1);
  const remaining = Math.max(0, Math.ceil((POPUP_TIMEOUT - elapsed) / 1000));

  // SVG ring
  const R  = 22;
  const C  = 2 * Math.PI * R;
  const strokeOffset = C * progress;

  const accent  = isSuccess ? '#10b981' : '#ef4444';
  const bgBand  = isSuccess ? '#ecfdf5' : '#fef2f2';
  const ringBg  = isSuccess ? '#a7f3d0' : '#fecaca';

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes _overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes _card-in {
          from { opacity: 0; transform: translateY(28px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes _icon-pop {
          0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          55%  { transform: scale(1.18) rotate(4deg);  opacity: 1; }
          75%  { transform: scale(0.94) rotate(-2deg); }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes _check-draw {
          from { stroke-dashoffset: 64; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes _cross-a {
          from { stroke-dashoffset: 42; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes _cross-b {
          from { stroke-dashoffset: 42; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes _ring-ripple {
          0%   { opacity: .7; transform: scale(1); }
          100% { opacity: 0;  transform: scale(1.55); }
        }
        @keyframes _sparkle {
          0%   { opacity: 0; transform: scale(0)   translateY(0); }
          45%  { opacity: 1; transform: scale(1.3) translateY(-16px); }
          100% { opacity: 0; transform: scale(.6)  translateY(-30px); }
        }
        @keyframes _btn-hover {
          0%,100% { box-shadow: 0 4px 14px ${accent}55; }
          50%      { box-shadow: 0 6px 22px ${accent}88; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          zIndex: 10001,
          backdropFilter: 'blur(8px)',
          background: 'rgba(2,8,23,0.6)',
          animation: '_overlay-in 0.22s ease forwards',
        }}
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="relative w-full max-w-md overflow-hidden"
          style={{
            borderRadius: 28,
            background: '#fff',
            boxShadow: '0 32px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)',
            animation: entered ? '_card-in 0.42s cubic-bezier(0.34,1.3,0.64,1) forwards' : 'none',
            opacity: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Hero band ── */}
          <div
            className="relative flex flex-col items-center pt-12 pb-9 px-8 overflow-hidden select-none"
            style={{ background: bgBand }}
          >
            {/* Sparkles */}
            {isSuccess && SPARKLES.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: s.top, left: (s as { left?: string }).left, right: (s as { right?: string }).right,
                  width: s.size, height: s.size,
                  background: s.color,
                  animation: `_sparkle 0.7s ease-out ${s.delay} both`,
                }}
              />
            ))}

            {/* Ripple ring */}
            <span
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 130, height: 130,
                border: `3px solid ${ringBg}`,
                animation: '_ring-ripple 1.6s ease-out 0.3s infinite',
              }}
            />
            <span
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 110, height: 110,
                border: `3px solid ${ringBg}`,
                animation: '_ring-ripple 1.6s ease-out 0.6s infinite',
              }}
            />

            {/* Icon */}
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: 92, height: 92,
                background: accent,
                boxShadow: `0 8px 24px ${accent}66`,
                animation: '_icon-pop 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.08s both',
              }}
            >
              {isSuccess ? (
                <svg viewBox="0 0 52 52" width={48} height={48} fill="none">
                  <polyline
                    points="12,27 22,37 40,17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="64"
                    strokeDashoffset="64"
                    style={{ animation: '_check-draw 0.4s ease 0.48s forwards' }}
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 44 44" width={40} height={40} fill="none">
                  <line x1="11" y1="11" x2="33" y2="33"
                    stroke="white" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray="42" strokeDashoffset="42"
                    style={{ animation: '_cross-a 0.28s ease 0.3s forwards' }}
                  />
                  <line x1="33" y1="11" x2="11" y2="33"
                    stroke="white" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray="42" strokeDashoffset="42"
                    style={{ animation: '_cross-b 0.28s ease 0.52s forwards' }}
                  />
                </svg>
              )}
            </div>

            {/* Heading */}
            <h2
              className="mt-6 text-[1.65rem] font-extrabold tracking-tight leading-tight text-center"
              style={{ color: isSuccess ? '#064e3b' : '#7f1d1d' }}
            >
              {isSuccess ? 'Payment Received!' : 'Payment Failed'}
            </h2>
            <p
              className="mt-2 text-sm text-center max-w-[260px] leading-relaxed"
              style={{ color: isSuccess ? '#065f46' : '#991b1b', opacity: 0.85 }}
            >
              {isSuccess
                ? 'The subscriber approved the request. Funds have been collected successfully.'
                : event.message || 'The transaction could not be completed.'}
            </p>

            {/* Close button inside band */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.08)', color: isSuccess ? '#065f46' : '#7f1d1d' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Detail rows ── */}
          <div className="px-7 pt-5 pb-3 divide-y divide-slate-100">
            {[
              { label: 'Transaction ID', value: event.requestTransactionId, mono: true  },
              ...(event.transactionId ? [{ label: 'Gateway Ref', value: event.transactionId, mono: true }] : []),
              { label: 'Response Code',  value: event.responseCode || '—',  mono: false },
              ...(event.message         ? [{ label: 'Message',     value: event.message,          mono: false }] : []),
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider shrink-0 pt-0.5 font-medium">{label}</span>
                <span className={cn('text-slate-700 font-semibold text-right break-all', mono && 'font-mono text-xs')}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Footer: countdown ring + CTA ── */}
          <div className="flex items-center gap-3 px-7 pt-3 pb-7">
            {/* Circular timer */}
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4.5" />
                <circle
                  cx="28" cy="28" r={R}
                  fill="none"
                  stroke={accent}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: 'stroke-dashoffset 0.25s linear' }}
                />
              </svg>
              <span
                className="absolute text-[11px] font-bold tabular-nums"
                style={{ color: accent }}
              >
                {remaining}s
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-bold text-[15px] tracking-wide transition-transform duration-100 active:scale-95"
              style={{
                background: accent,
                color: '#fff',
                boxShadow: `0 4px 18px ${accent}55`,
                animation: '_btn-hover 2.4s ease-in-out 1s infinite',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
            >
              {isSuccess ? 'Great, thanks!' : 'Dismiss'}
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body,
  );
}

// ── SSE Hook ──────────────────────────────────────────────────────────────────

function usePaymentEvents(onEvent: (e: PaymentCallbackEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? ''
      : '';
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    const url = `${base}/admin/payment-settings/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const data: PaymentCallbackEvent = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        onEventRef.current(data);
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      // Browser auto-reconnects on error — no action needed
    };

    return () => es.close();
  }, []);
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  methods: PaymentMethod[];
  types: PaymentType[];
}

export default function PaymentTestingTab({ methods, types }: Props) {
  const toast = useToast();

  // ── Form state ───────────────────────────────────────────────────────────
  const activeMethods = methods.filter((m) => m.isActive);
  const activeTypes   = types.filter((t) => t.isActive);

  const [selectedMethodId,  setSelectedMethodId]  = useState(activeMethods[0]?.id ?? '');
  const [selectedTypeKey,   setSelectedTypeKey]   = useState<string>(activeTypes[0]?.key ?? '');
  const [mobilePhone,       setMobilePhone]        = useState('');
  const [amount,            setAmount]             = useState('100');
  const [currency]                                  = useState('RWF');
  const [direction,         setDirection]          = useState<'collect' | 'deposit'>('collect');

  // ── Runtime state ────────────────────────────────────────────────────────
  const [sending,        setSending]        = useState(false);
  const [lastResult,     setLastResult]     = useState<TestPaymentResult | null>(null);
  const [polling,        setPolling]        = useState(false);
  const [transactions,   setTransactions]   = useState<PaymentTransaction[]>([]);
  const [loadingTxns,    setLoadingTxns]    = useState(false);
  const [balance,        setBalance]        = useState<{ balance: string; success: boolean } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // ── Popup state ──────────────────────────────────────────────────────────
  const [callbackEvent, setCallbackEvent] = useState<PaymentCallbackEvent | null>(null);

  // ── Data loaders — declared first so refs below can reference them ────────
  const loadTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const res = await paymentSettingsApi.listTransactions({ isTest: true, limit: 20 });
      setTransactions(Array.isArray(res) ? res : (res.items ?? []));
    } catch { /* silent */ }
    finally { setLoadingTxns(false); }
  }, []);

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await paymentSettingsApi.getBalance();
      setBalance(res);
    } catch {
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadBalance();
  }, [loadTransactions, loadBalance]);

  // ── Background auto-poll while a pending transaction is active ───────────
  const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTxIdRef = useRef<string | null>(null);

  const stopAutoPoll = useCallback(() => {
    if (autoPollRef.current) {
      clearInterval(autoPollRef.current);
      autoPollRef.current = null;
    }
    pendingTxIdRef.current = null;
  }, []);

  const startAutoPoll = useCallback((txId: string) => {
    stopAutoPoll();
    pendingTxIdRef.current = txId;
    autoPollRef.current = setInterval(async () => {
      if (!pendingTxIdRef.current) return;
      try {
        const updated = await paymentSettingsApi.checkTransactionStatus(pendingTxIdRef.current);
        const tx = updated.transaction ?? (updated as unknown as PaymentTransaction);
        if (tx.status !== 'pending') {
          stopAutoPoll();
          setLastResult((prev) => prev ? { ...prev, transaction: tx } : null);
          setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
          setCallbackEvent({
            type: tx.status === 'successful' ? 'payment.confirmed' : 'payment.failed',
            requestTransactionId: tx.requestTransactionId,
            transactionId: tx.gatewayTransactionId ?? '',
            status: tx.status,
            responseCode: tx.responseCode ?? '',
            message: tx.message ?? '',
          });
          loadTransactions();
        }
      } catch { /* keep polling */ }
    }, 5000);
  }, [stopAutoPoll, loadTransactions]);

  useEffect(() => () => stopAutoPoll(), [stopAutoPoll]);

  // ── SSE subscription — fires when webhook callback arrives ───────────────
  usePaymentEvents(useCallback((event: PaymentCallbackEvent) => {
    stopAutoPoll();
    setCallbackEvent(event);
    setLastResult((prev) => {
      if (!prev || prev.transaction.requestTransactionId !== event.requestTransactionId) return prev;
      return {
        ...prev,
        transaction: {
          ...prev.transaction,
          status: event.status.toLowerCase() as PaymentTransaction['status'],
          responseCode: event.responseCode,
          message: event.message,
        },
      } satisfies TestPaymentResult;
    });
    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAutoPoll, loadTransactions]));

  // ── Send payment ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!mobilePhone.trim() || !amount) {
      toast.error('Enter phone and amount.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error('Amount must be at least 1 RWF.');
      return;
    }

    setSending(true);
    setLastResult(null);
    setCallbackEvent(null);
    stopAutoPoll();
    try {
      if (direction === 'deposit') {
        const payload: TestDepositPayload = {
          mobilePhone: mobilePhone.replace(/\s/g, ''),
          amount:      numAmount,
        };
        const result = await paymentSettingsApi.testDeposit(payload);
        setLastResult(result);
        toast.success(`Deposit ${result.transaction.status}.`);
        setCallbackEvent({
          type: result.transaction.status === 'successful' ? 'payment.confirmed' : 'payment.failed',
          requestTransactionId: result.transaction.requestTransactionId,
          transactionId: result.transaction.gatewayTransactionId ?? '',
          status: result.transaction.status,
          responseCode: result.responseCode,
          message: result.message,
        });
      } else {
        const payload: TestPaymentPayload = {
          mobilePhone: mobilePhone.replace(/\s/g, ''),
          amount:      numAmount,
          currency,
          ...(selectedTypeKey ? { paymentTypeKey: selectedTypeKey as never } : {}),
        };
        const result = await paymentSettingsApi.testPayment(payload);
        setLastResult(result);
        if (result.transaction.status === 'pending') {
          toast.success('Request sent — subscriber will receive a USSD prompt to confirm.');
          // Start polling every 5 s until confirmed or failed
          startAutoPoll(result.transaction.id);
        } else {
          toast.success(`Payment ${result.transaction.status}.`);
        }
      }
      await loadTransactions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Request failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Poll status ──────────────────────────────────────────────────────────
  const handlePollStatus = async (txId: string) => {
    setPolling(true);
    try {
      const updated = await paymentSettingsApi.checkTransactionStatus(txId);
      const tx = updated.transaction ?? updated;
      setLastResult((prev) => prev ? { ...prev, transaction: tx } : null);
      setTransactions((prev) => prev.map((t) => (t.id === txId ? tx : t)));
      if (tx.status !== 'pending') {
        stopAutoPoll();
        setCallbackEvent({
          type: tx.status === 'successful' ? 'payment.confirmed' : 'payment.failed',
          requestTransactionId: tx.requestTransactionId,
          transactionId: tx.gatewayTransactionId ?? '',
          status: tx.status,
          responseCode: tx.responseCode ?? '',
          message: tx.message ?? '',
        });
      } else {
        toast.success('Still pending — subscriber has not confirmed yet.');
      }
    } catch {
      toast.error('Status check failed');
    } finally {
      setPolling(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Callback success/failure popup ────────────────────────────── */}
      {callbackEvent && (
        <PaymentSuccessPopup
          event={callbackEvent}
          onClose={() => setCallbackEvent(null)}
        />
      )}

      <div className="space-y-6">

        {/* Balance banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <Wallet className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">IntouchPay Account Balance</p>
            {loadingBalance ? (
              <p className="text-sm text-slate-400 mt-0.5">Loading…</p>
            ) : balance?.success ? (
              <p className="text-lg font-bold text-emerald-800">{balance.balance} RWF</p>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">Could not retrieve balance</p>
            )}
          </div>
          <button
            onClick={loadBalance}
            disabled={loadingBalance}
            className="shrink-0 p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loadingBalance && 'animate-spin')} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Payment Form ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Send Test {direction === 'deposit' ? 'Deposit' : 'Payment'}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">All test transactions are flagged with isTest=true in the database.</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Direction */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('collect')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-colors',
                      direction === 'collect'
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" /> Collect (RequestPayment)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('deposit')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-colors',
                      direction === 'deposit'
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Send (RequestDeposit)
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Payment Method</label>
                <div className="relative">
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {activeMethods.length === 0 && <option value="">No active methods</option>}
                    {activeMethods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Payment Type — not applicable to deposits */}
              {direction === 'collect' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Payment Type <span className="text-slate-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTypeKey}
                      onChange={(e) => setSelectedTypeKey(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <option value="">— None —</option>
                      {activeTypes.map((t) => (
                        <option key={t.id} value={t.key}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Mobile Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Mobile Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="250788000000"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Accepts: 0780313448 or 250780313448 — auto-converted to international format</p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none">RWF</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    className="w-full pl-12 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Test account maximum: 100 RWF</p>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || activeMethods.length === 0}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all',
                  sending || activeMethods.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow',
                )}
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Zap className="w-4 h-4" /> {direction === 'deposit' ? 'Send Deposit Request' : 'Send Payment Request'}</>
                )}
              </button>

              {activeMethods.length === 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  No active payment methods. Enable at least one method in the Payment Methods tab.
                </div>
              )}
            </div>
          </div>

          {/* ── Last Result ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Last Request Result</h3>
              </div>
            </div>

            <div className="p-5">
              {!lastResult ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
                  <Zap className="w-8 h-8 mb-2 opacity-30" />
                  Send a payment to see the response here
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={lastResult.transaction.status} />
                    {lastResult.transaction.status === 'pending' && (
                      <button
                        onClick={() => handlePollStatus(lastResult.transaction.id)}
                        disabled={polling}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', polling && 'animate-spin')} />
                        Check Status
                      </button>
                    )}
                  </div>

                  {lastResult.transaction.status === 'pending' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      <span>
                        Checking every 5 s for confirmation — a popup will appear automatically once the subscriber approves.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Transaction ID', value: lastResult.transaction.requestTransactionId },
                      { label: 'Gateway Ref',    value: lastResult.transaction.gatewayTransactionId ?? '—' },
                      { label: 'Amount',         value: fmt(lastResult.transaction.amount) },
                      { label: 'Phone',          value: lastResult.transaction.mobilePhone },
                      { label: 'Response Code',  value: lastResult.responseCode ?? lastResult.transaction.responseCode ?? '—' },
                      { label: 'Message',        value: lastResult.message ?? lastResult.transaction.message ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</p>
                        <p className="text-slate-700 font-medium mt-0.5 break-all">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Transaction History ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Recent Test Transactions</h3>
            </div>
            <button
              onClick={loadTransactions}
              disabled={loadingTxns}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loadingTxns && 'animate-spin')} />
              Refresh
            </button>
          </div>

          {loadingTxns ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              No test transactions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Request ID', 'Phone', 'Amount', 'Type', 'Status', 'Created', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 max-w-[160px] truncate">{tx.requestTransactionId}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.mobilePhone}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{fmt(tx.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{tx.paymentTypeKey ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {tx.status === 'pending' && (
                          <button
                            onClick={() => handlePollStatus(tx.id)}
                            className="text-violet-600 hover:text-violet-800 font-medium"
                          >
                            Check
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

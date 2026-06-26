'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Phone, Zap, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, AlertCircle, Activity, Wallet, X,
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

function PaymentSuccessPopup({
  event,
  onClose,
}: {
  event: PaymentCallbackEvent;
  onClose: () => void;
}) {
  const isSuccess = event.type === 'payment.confirmed';

  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'relative w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300',
          isSuccess ? 'bg-white' : 'bg-white',
        )}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            'mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5',
            isSuccess ? 'bg-emerald-100' : 'bg-red-100',
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          ) : (
            <XCircle className="w-10 h-10 text-red-500" />
          )}
        </div>

        {/* Title */}
        <h2 className={cn('text-2xl font-bold mb-1', isSuccess ? 'text-emerald-700' : 'text-red-600')}>
          {isSuccess ? 'Payment Confirmed!' : 'Payment Failed'}
        </h2>
        <p className="text-slate-500 text-sm mb-5">
          {isSuccess
            ? 'The subscriber confirmed the payment. Funds have been received.'
            : event.message || 'The payment was not completed.'}
        </p>

        {/* Details */}
        <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400 uppercase tracking-wide">Transaction ID</span>
            <span className="font-mono text-slate-700 truncate max-w-[160px]">{event.requestTransactionId}</span>
          </div>
          {event.transactionId && (
            <div className="flex justify-between">
              <span className="text-slate-400 uppercase tracking-wide">Gateway Ref</span>
              <span className="font-mono text-slate-700">{event.transactionId}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400 uppercase tracking-wide">Code</span>
            <span className="font-medium text-slate-700">{event.responseCode}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className={cn(
            'w-full py-2.5 rounded-xl font-semibold text-sm transition-all',
            isSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
          )}
        >
          {isSuccess ? 'Great, thanks!' : 'Dismiss'}
        </button>

        {/* Auto-close bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-3xl overflow-hidden">
          <div
            className={cn('h-full animate-[shrink_8s_linear_forwards]', isSuccess ? 'bg-emerald-400' : 'bg-red-300')}
          />
        </div>
      </div>
    </div>
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
      setTransactions(Array.isArray(res) ? res : (res.data ?? []));
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
      await loadTransactions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Payment request failed';
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
                <h3 className="font-semibold text-slate-800 text-sm">Send Test Payment</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">All test transactions are flagged with isTest=true in the database.</p>
            </div>

            <div className="p-5 space-y-4">
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

              {/* Payment Type */}
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
                  <><Zap className="w-4 h-4" /> Send Payment Request</>
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

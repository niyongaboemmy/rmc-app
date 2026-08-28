'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useIremboPayment,
  IremboInvoiceHandle,
  IremboPaymentPhase,
} from '@/hooks/useIremboPayment';

export interface IremboPayWidgetProps {
  invoice: IremboInvoiceHandle;
  amount: number;
  currency?: string;
  locale?: 'EN' | 'FR' | 'RW';
  /** Must reflect the backend's view — i.e. what the signed webhook recorded. */
  checkStatus: (transactionId: string) => Promise<'PENDING' | 'SUCCESSFUL' | 'FAILED'>;
  onConfirmed?: () => void;
  /**
   * Open the payment sheet as soon as the invoice exists, instead of waiting
   * for a second click. The payer already pressed "Pay"; making them press
   * again is a step that communicates nothing.
   */
  autoOpen?: boolean;
  className?: string;
}

/** What IremboPay's own sheet offers, shown before the payer commits. */
const ACCEPTED = ['MTN MoMo', 'Airtel', 'Visa', 'Mastercard', 'Bank', 'USSD'];

const PHASE_LABELS: Record<IremboPaymentPhase, string> = {
  idle: 'Pay now',
  'loading-widget': 'Opening payment…',
  'awaiting-payer': 'Pay now',
  confirming: 'Confirming payment…',
  confirmed: 'Payment confirmed',
  failed: 'Try again',
};

/**
 * Card, MoMo and bank payment through IremboPay's hosted widget.
 *
 * Card details never touch our infrastructure — the widget renders in an
 * IremboPay-controlled context, which is what keeps us out of PCI scope.
 *
 * The button never claims success on the widget's word: closing the modal or a
 * confirmed-looking callback both leave a payable invoice, and only the backend
 * (via the signed webhook) flips this to confirmed.
 */
export function IremboPayWidget({
  invoice,
  amount,
  currency = 'RWF',
  locale = 'EN',
  checkStatus,
  onConfirmed,
  autoOpen = false,
  className,
}: IremboPayWidgetProps) {
  const [copied, setCopied] = useState(false);
  const { phase, error, pay } = useIremboPayment({ checkStatus, locale, onConfirmed });

  // Guarded by a ref, not by `phase`: the sheet must open exactly once. A payer
  // who closes it gets the button back rather than a modal that reopens itself.
  const opened = useRef(false);
  useEffect(() => {
    if (!autoOpen || opened.current || !invoice.invoiceNumber) return;
    opened.current = true;
    void pay(invoice);
  }, [autoOpen, invoice, pay]);

  const busy = phase === 'loading-widget' || phase === 'confirming';
  const done = phase === 'confirmed';

  const copyLink = async () => {
    if (!invoice.paymentLinkUrl) return;
    try {
      await navigator.clipboard.writeText(invoice.paymentLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied — the link is still visible and clickable */
    }
  };

  const money = new Intl.NumberFormat('rw-RW').format(amount);

  return (
    <div className={cn('space-y-3', className)}>
      {/*
        Deliberately no `sm:flex-row`: this panel lives inside a ~300px drawer
        column, and viewport breakpoints don't know that — at >=640px they flip
        it horizontal and wrap "Amount to pay" and the total onto separate
        lines. It stacks at every width instead.
      */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-3.5 bg-gradient-to-b from-gray-50/80 to-white">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Amount to pay
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[26px] leading-none font-bold tabular-nums text-gray-900">
              {money}
            </span>{' '}
            {/* An explicit space: the flex gap is visual only, and without it
                the accessible name reads "5.000RWF". */}
            <span className="text-sm font-semibold text-gray-400">{currency}</span>
          </p>

          {invoice.invoiceNumber && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="shrink-0">Invoice</span>
              <span className="font-mono text-[11px] text-gray-500 truncate">
                {invoice.invoiceNumber}
              </span>
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          {!done && (
            <div className="mb-3 flex flex-wrap gap-1">
              {ACCEPTED.map((label) => (
                <span
                  key={label}
                  className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200/80"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void pay(invoice)}
            disabled={busy || done}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200',
              done
                ? 'bg-rmc-green-light text-rmc-green cursor-default'
                : 'bg-rmc-green text-white shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark active:scale-[0.99] disabled:opacity-60 disabled:shadow-none',
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {phase === 'awaiting-payer' ? 'Reopen payment' : PHASE_LABELS[phase]}
          </button>
        </div>
      </div>

      {/* One status band, so the panel never shows two competing messages. */}
      {phase === 'confirming' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-gray-400" />
          <p className="text-[12.5px] leading-relaxed text-gray-600">
            Confirming your payment. Please keep this page open.
          </p>
        </div>
      )}

      {done && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rmc-green/25 bg-rmc-green-light/40 px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" />
          <p className="text-[12.5px] font-medium leading-relaxed text-rmc-green">
            Payment received. Thank you.
          </p>
        </div>
      )}

      {error && !done && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[12.5px] leading-relaxed text-amber-700">{error}</p>
        </div>
      )}

      {/* Pay later / share — a closed sheet must not strand the payer. */}
      {invoice.paymentLinkUrl && !done && (
        <div className="flex flex-col gap-1 text-[12.5px]">
          <a
            href={invoice.paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 font-medium text-rmc-green transition-colors hover:bg-rmc-green-light/40"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Pay later or on another device
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 text-left text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
            {copied ? 'Link copied' : 'Copy payment link'}
          </button>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <ShieldCheck className="h-3 w-3 shrink-0" />
        Secured by IremboPay — regulated by BNR, PCI-DSS compliant.
      </p>
    </div>
  );
}

export default IremboPayWidget;

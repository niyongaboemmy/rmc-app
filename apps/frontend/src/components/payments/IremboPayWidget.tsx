'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
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
  className?: string;
}

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
  className,
}: IremboPayWidgetProps) {
  const [copied, setCopied] = useState(false);
  const { phase, error, pay } = useIremboPayment({ checkStatus, locale, onConfirmed });

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

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">Amount to pay</p>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('rw-RW').format(amount)} {currency}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Invoice {invoice.invoiceNumber} — pay by card, MoMo or bank
          </p>
        </div>

        <button
          type="button"
          onClick={() => void pay(invoice)}
          disabled={busy || done}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors w-full sm:w-auto',
            done
              ? 'bg-rmc-green-light text-rmc-green cursor-default'
              : 'bg-rmc-green text-white hover:bg-rmc-green/90 disabled:opacity-60',
          )}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : done ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {PHASE_LABELS[phase]}
        </button>
      </div>

      {phase === 'confirming' && (
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
          Waiting for the payment to be confirmed. Please keep this page open.
        </p>
      )}

      {done && (
        <p className="flex items-start gap-2 text-sm text-rmc-green">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          Payment received. Thank you.
        </p>
      )}

      {error && !done && (
        <p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Pay later / share — a closed modal must not strand the payer. */}
      {invoice.paymentLinkUrl && !done && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href={invoice.paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-rmc-green hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Pay later or on another device
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Link copied' : 'Copy payment link'}
          </button>
        </div>
      )}
    </div>
  );
}

export default IremboPayWidget;

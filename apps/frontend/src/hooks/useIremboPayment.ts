'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** What the backend hands us after creating an invoice. */
export interface IremboInvoiceHandle {
  transactionId: string;
  invoiceNumber: string;
  publicKey?: string;
  widgetScriptUrl?: string;
  paymentLinkUrl?: string;
}

export type IremboPaymentPhase =
  | 'idle'
  | 'loading-widget'
  | 'awaiting-payer'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface UseIremboPaymentOptions {
  /**
   * Asks the backend for the authoritative status of a transaction.
   * Must resolve 'SUCCESSFUL' only once the webhook has been applied.
   */
  checkStatus: (transactionId: string) => Promise<'PENDING' | 'SUCCESSFUL' | 'FAILED'>;
  locale?: 'EN' | 'FR' | 'RW';
  onConfirmed?: () => void;
  onFailed?: (message: string) => void;
  /** How long to keep polling before giving up on a live confirmation. */
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
}

interface IremboWidgetError {
  message?: string;
  /** Present on the structured `{success:false, errors:[…]}` shape. */
  errors?: Array<{ code?: string; detail?: string }>;
  code?: string;
}

interface IremboGlobal {
  initiate: (options: {
    publicKey: string;
    invoiceNumber: string;
    locale?: unknown;
    callback: (err?: IremboWidgetError, resp?: unknown) => void;
  }) => void;
  locale?: Record<string, unknown>;
  closeModal?: () => void;
}

/**
 * Widget error codes, per the v3 "Javascript widget integration" docs.
 *
 * The widget hands back a machine code; a payer needs a sentence that tells
 * them whether to retry, wait, or stop. Note that several of these are not
 * failures at all from the payer's point of view — `BAD_INVOICES_PAID` means
 * the money already arrived — so the copy must not tell them to try again.
 */
const WIDGET_ERROR_MESSAGES: Record<string, string> = {
  INVALID_KEY: 'This payment page is misconfigured. Please contact RMC — do not retry.',
  INVOICE_NOT_FOUND: 'We could not find this payment. Please start again.',
  INVOICE_MISSING: 'We could not find this payment. Please start again.',
  BAD_INVOICES_PAID: 'This payment has already been completed. No further action is needed.',
  BAD_INVOICES_PAYMENT_EXPIRED:
    'This payment link has expired. Please start a new payment.',
  BAD_INVOICES_IN_BATCH:
    'This payment is part of a group and cannot be paid on its own.',
  BAD_LOCALE: 'This payment page could not load in your language. Please try again in English.',
};

/** True when the "error" actually means the payment succeeded. */
function isAlreadyPaid(code?: string): boolean {
  return code === 'BAD_INVOICES_PAID';
}

function describeWidgetError(err: IremboWidgetError): { message: string; code?: string } {
  const code = err.code ?? err.errors?.[0]?.code;
  if (code && WIDGET_ERROR_MESSAGES[code]) return { message: WIDGET_ERROR_MESSAGES[code], code };
  return {
    message:
      err.errors?.[0]?.detail ??
      err.message ??
      'The payment was not completed. You can try again.',
    code,
  };
}

declare global {
  interface Window {
    IremboPay?: IremboGlobal;
  }
}

/**
 * Loads a script exactly once per URL, even across several components mounting
 * at the same time — a second `<script>` tag re-registers `window.IremboPay`
 * mid-payment and drops the open modal.
 */
const scriptPromises = new Map<string, Promise<void>>();

function loadScript(url: string): Promise<void> {
  const cached = scriptPromises.get(url);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
    if (existing) {
      if (window.IremboPay) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Widget script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromises.delete(url);
      reject(new Error('Widget script failed to load'));
    };
    document.body.appendChild(script);
  });

  scriptPromises.set(url, promise);
  return promise;
}

/**
 * Drives the IremboPay inline widget.
 *
 * The rule the whole hook is built around: **the widget callback is a UX signal
 * only.** It runs on the payer's machine and can be replayed, spoofed or simply
 * wrong. So a "success" callback moves us to `confirming`, and only the
 * backend — which learns the truth from the signed webhook — can move us to
 * `confirmed`.
 */
export function useIremboPayment(options: UseIremboPaymentOptions) {
  const {
    checkStatus,
    locale = 'EN',
    onConfirmed,
    onFailed,
    pollTimeoutMs = 120_000,
    pollIntervalMs = 3_000,
  } = options;

  const [phase, setPhase] = useState<IremboPaymentPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  /** Polls the backend until it confirms, fails, or we run out of patience. */
  const confirm = useCallback(
    async (transactionId: string) => {
      setPhase('confirming');
      const deadline = Date.now() + pollTimeoutMs;

      while (Date.now() < deadline) {
        if (cancelled.current) return;
        try {
          const status = await checkStatus(transactionId);
          if (status === 'SUCCESSFUL') {
            if (cancelled.current) return;
            setPhase('confirmed');
            onConfirmed?.();
            return;
          }
          if (status === 'FAILED') {
            if (cancelled.current) return;
            setPhase('failed');
            setError('The payment did not go through.');
            onFailed?.('The payment did not go through.');
            return;
          }
        } catch {
          // A transient status-check failure is not a payment failure; keep polling.
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      if (cancelled.current) return;
      // Not a failure — the invoice is still payable and reconciliation will
      // settle it. Saying "failed" here would be a lie the payer acts on.
      setPhase('awaiting-payer');
      setError(
        'We have not had confirmation yet. If you completed the payment it will be recorded shortly.',
      );
    },
    [checkStatus, onConfirmed, onFailed, pollIntervalMs, pollTimeoutMs],
  );

  const pay = useCallback(
    async (invoice: IremboInvoiceHandle) => {
      setError(null);

      if (!invoice.publicKey || !invoice.widgetScriptUrl) {
        setPhase('failed');
        const message = 'The payment widget is not configured. Use the payment link instead.';
        setError(message);
        onFailed?.(message);
        return;
      }

      try {
        setPhase('loading-widget');
        await loadScript(invoice.widgetScriptUrl);

        const irembo = window.IremboPay;
        if (!irembo?.initiate) throw new Error('The payment widget did not load correctly.');

        setPhase('awaiting-payer');
        irembo.initiate({
          publicKey: invoice.publicKey,
          invoiceNumber: invoice.invoiceNumber,
          // The widget's own locale constants when present, the plain code otherwise,
          // so IremboPay's SMS to the payer matches the language they are reading.
          locale: irembo.locale?.[locale] ?? locale,
          callback: (err) => {
            if (err) {
              const { message, code } = describeWidgetError(err);

              // "Already paid" is a success wearing an error's clothing — the
              // money is in. Confirm it with the backend rather than telling the
              // payer something went wrong.
              if (isAlreadyPaid(code)) {
                void confirm(invoice.transactionId);
                return;
              }

              // The invoice stays payable — this is a UX message, not a verdict.
              setPhase('awaiting-payer');
              setError(message);
              return;
            }
            void confirm(invoice.transactionId);
          },
        });
      } catch (err) {
        setPhase('failed');
        const message = (err as Error).message || 'Could not open the payment window.';
        setError(message);
        onFailed?.(message);
      }
    },
    [confirm, locale, onFailed],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
  }, []);

  return { phase, error, pay, confirm, reset };
}

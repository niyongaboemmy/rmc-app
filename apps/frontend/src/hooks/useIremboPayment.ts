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

interface IremboGlobal {
  initiate: (options: {
    publicKey: string;
    invoiceNumber: string;
    locale?: unknown;
    callback: (err?: { message?: string }, resp?: unknown) => void;
  }) => void;
  locale?: Record<string, unknown>;
  closeModal?: () => void;
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
              // The invoice stays payable — this is a UX message, not a verdict.
              setPhase('awaiting-payer');
              setError(err.message ?? 'The payment was not completed. You can try again.');
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

import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';

/** Business outcome of a gateway call, normalised across providers. */
export type GatewayStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

/**
 * One line on a multi-item charge — a single cart entry, for instance.
 *
 * Providers that have no concept of items (IntouchPay) charge the request's
 * total and ignore these; providers that do (IremboPay) turn them into one
 * invoice with several payment items, which is what lets a whole cart be paid
 * in a single transaction.
 */
export interface PaymentLineItem {
  paymentTypeKey: string;
  paymentTypeRateId?: string;
  /** Unit amount. The line total is `amount × quantity`. */
  amount: number;
  quantity?: number;
  description?: string;
}

export interface PaymentChargeRequest {
  /** Our idempotency key. Deterministic per domain record — never random on retry. */
  transactionId: string;
  amount: number;
  /** ISO 4217. 'RWF' unless the caller says otherwise. */
  currency?: string;
  /** DONATION | MARRIAGE_FEE | … — used to resolve the provider-side product. */
  paymentTypeKey: string;
  /** Optional rate/sub-category id, when the type has tiered pricing. */
  paymentTypeRateId?: string;
  /** Domain record id (donation.id, application.id). */
  referenceId?: string;
  payer: { name?: string; phone?: string; email?: string };
  locale?: 'EN' | 'FR' | 'RW';
  description?: string;
  expiresAt?: Date;
  /** MoMo push only. Omit to create a payable invoice without pushing. */
  pushProvider?: 'MTN' | 'AIRTEL';
  /**
   * Several lines settled by one payment. When omitted the charge is a single
   * line of `amount` against `paymentTypeKey`.
   *
   * The request's `amount` must still equal the sum of the lines — it is what
   * non-itemised providers charge, and what the ledger records.
   */
  items?: PaymentLineItem[];
  /** Marks the transaction as a staff test rather than a real payment. */
  isTest?: boolean;
  /** User id that triggered the charge, when it came from the admin UI. */
  initiatedBy?: string;
}

export interface PaymentChargeResult {
  /** 'intouchpay' | 'irembopay' */
  provider: string;
  status: GatewayStatus;
  /** invoiceNumber (IremboPay) or gateway transaction id (IntouchPay). */
  providerReference: string;
  /**
   * What a domain record must persist so the webhook can find it again.
   *
   * Always begins with our `transactionId`, because that is what every
   * provider's callback carries back and what the domain webhook services match
   * on. `providerReference` is NOT interchangeable: IremboPay's is an invoice
   * number the callback never mentions, so persisting it silently breaks
   * settlement — the payment succeeds and the record stays pending forever.
   */
  domainReference: string;
  /** Our transactionId, echoed for correlation. */
  transactionId: string;
  paymentLinkUrl?: string;
  publicKey?: string;
  widgetScriptUrl?: string;
  responseCode?: string;
  message?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentStatusResult {
  status: GatewayStatus;
  providerReference: string;
  paidAt?: Date;
  paidAmount?: number;
  balance?: number;
  /** MTN_MOMO | ONLINE_CARD | BK | … — free string; providers add channels. */
  providerPaymentMethod?: string;
  responseCode?: string;
  message?: string;
}

/** The contract every payment gateway satisfies. */
export interface PaymentGatewayProvider {
  readonly code: PaymentMethodCode;
  readonly providerName: string;
  isConfigured(): Promise<boolean>;
  charge(req: PaymentChargeRequest): Promise<PaymentChargeResult>;
  /** `reference` is a provider reference or our own transactionId, provider permitting. */
  getStatus(reference: string): Promise<PaymentStatusResult>;
}

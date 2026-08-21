import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';

/** Business outcome of a gateway call, normalised across providers. */
export type GatewayStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

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

/**
 * Wire types and error vocabulary for the IremboPay REST API (v3).
 *
 * A code → human-explanation map, the same shape the retired gateway used: the
 * provider returns machine codes, and the operator reading the admin UI needs a
 * sentence. Anything not in the map falls back to the provider's own `detail`.
 */

export type IremboLanguage = 'EN' | 'FR' | 'RW';

/**
 * Parses a timestamp as IremboPay actually sends it.
 *
 * Their responses carry an hours-only UTC offset — `2026-08-29T17:26:54.099+02`
 * — which `new Date()` cannot parse (ISO 8601 wants `+02:00` or `+0200`), so it
 * yields `Invalid Date`. Writing that to a timestamptz column fails the insert
 * with `invalid input syntax ... "0NaN-NaN-NaN..."`, which loses an invoice that
 * IremboPay has already created and the payer can already pay.
 *
 * Returns `undefined` rather than an invalid Date: a missing expiry is
 * recoverable, a NaN one poisons every write it reaches.
 */
export function parseIremboDate(value: string | Date | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;

  // `+02` / `-05` at the very end → `+02:00`. Offsets that already carry
  // minutes, and a trailing `Z`, are left exactly as they are.
  const normalised = value.trim().replace(/([+-]\d{2})$/, '$1:00');

  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * What a simulated payer does with an invoice. Lives here rather than beside
 * the sandbox service because the config service needs it too, and importing it
 * from there would put a cycle between the two.
 *
 *  - `off`     — not simulating; every call goes to the real IremboPay.
 *  - `success` — the payer approves after the configured delay; invoice -> PAID.
 *  - `fail`    — the payer never approves and the invoice expires -> FAILED.
 *  - `pending` — nothing ever happens, which is what a real abandoned payment
 *                looks like and the only way to exercise the timeout UI.
 */
export type IremboSimulatorMode = 'off' | 'success' | 'fail' | 'pending';

export const IREMBO_SIMULATOR_MODES: IremboSimulatorMode[] = ['off', 'success', 'fail', 'pending'];

/** Long enough that the pending UI is actually visible before it resolves. */
export const DEFAULT_SIMULATOR_DELAY_MS = 5_000;
export type IremboPushProvider = 'MTN' | 'AIRTEL';
export type IremboPaymentStatus = 'NEW' | 'PAID' | 'PARTIALLY_PAID' | 'EXPIRED';

/** Uniform response envelope — every endpoint returns this. */
export interface IremboEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ code?: string; detail?: string }>;
}

export interface IremboPaymentItem {
  code: string;
  quantity: number;
  unitAmount: number;
}

export interface IremboCustomer {
  name?: string;
  phoneNumber?: string;
  email?: string;
}

export interface CreateInvoiceInput {
  /** Our idempotency key. Reused ⇒ DUPLICATE_TRANSACTION_ID (400). */
  transactionId: string;
  paymentAccountIdentifier: string;
  /** We never send a total — IremboPay computes Σ(unitAmount × quantity). */
  paymentItems: IremboPaymentItem[];
  /** RFC 3339 with an offset. */
  expiryAt?: string;
  description?: string;
  language?: IremboLanguage;
  customer?: IremboCustomer;
  partialPaymentEnabled?: boolean;
  installmentPlan?: 'FLAT' | 'PERCENTAGE';
  installments?: Array<{ amount?: number; percentage?: number; dueDate?: string }>;
}

export interface UpdateInvoiceInput {
  expiryAt?: string;
  description?: string;
  language?: IremboLanguage;
  customer?: IremboCustomer;
  paymentItems?: IremboPaymentItem[];
  partialPaymentEnabled?: boolean;
  installmentPlan?: 'FLAT' | 'PERCENTAGE';
  installments?: Array<{ amount?: number; percentage?: number; dueDate?: string }>;
}

export interface IremboInvoice {
  invoiceNumber: string;
  transactionId: string;
  paymentAccountIdentifier: string;
  paymentItems: IremboPaymentItem[];
  paymentStatus: IremboPaymentStatus;
  amount: number;
  currency: string;
  type?: 'SINGLE' | 'BATCH';
  createdAt?: string;
  updatedAt?: string;
  expiryAt?: string;
  paidAt?: string;
  paymentReference?: string;
  /** MTN_MOMO | AIRTEL_MONEY | ONLINE_CARD | BK | … — open set. */
  paymentMethod?: string;
  customer?: IremboCustomer;
  description?: string;
  paymentLinkUrl?: string;
  partialPaymentEnabled?: boolean;
  paidAmount?: number;
  balance?: number;
  batchNumber?: string;
  childInvoices?: IremboInvoice[];
}

export interface InitiatePushInput {
  /** Payer MSISDN, normalised by `normalizeMsisdn()`. */
  accountIdentifier: string;
  paymentProvider: IremboPushProvider;
  invoiceNumber: string;
}

export interface IremboPushResult {
  accountIdentifier: string;
  paymentProvider: IremboPushProvider;
  invoiceNumber: string;
  amount: number;
  referenceId: string;
}

/** Payload delivered to our callback URL. */
export interface IremboNotification {
  /** Present on partial-payment notifications. */
  event?: string;
  success?: boolean;
  message?: string;
  data?: IremboInvoice & {
    paidAmount?: number;
    balance?: number;
    partialPaymentEnabled?: boolean;
  };
}

/** Documented error codes → an operator-readable sentence. */
export const IREMBOPAY_ERROR_MESSAGES: Record<string, string> = {
  // Auth
  AUTHENTICATION_FAILED: 'Invalid IremboPay secret key — check the Credentials tab.',
  // Create invoice
  TRANSACTION_ID_MISSING: 'No transaction ID was sent with the invoice.',
  DUPLICATE_TRANSACTION_ID: 'An invoice with this transaction ID already exists.',
  PRODUCT_MISSING: 'No payment item (product) was sent with the invoice.',
  BAD_PRODUCT: 'The payment item is malformed — check quantity and unit amount.',
  PRODUCT_NOT_FOUND:
    'The product code is not recognised by IremboPay. Check the Products tab mapping.',
  PAYMENT_ACCOUNT_MISSING: 'No payment account identifier was sent.',
  PAYMENT_ACCOUNT_NOT_FOUND:
    'The payment account identifier is not recognised. Check it in the Credentials tab.',
  BAD_EXPIRATION_DATE: 'The invoice expiry date is in the past or malformed.',
  BAD_LANGUAGE: 'The invoice language must be EN, FR or RW.',
  BAD_CUSTOMER_CONTACT: "The customer's phone number or e-mail is malformed.",
  // Get invoice
  INVOICE_NOT_FOUND: 'No such invoice at IremboPay.',
  // Initiate push
  PHONE_NUMBER_MISSING: 'No phone number was sent with the payment request.',
  BAD_PHONE_NUMBER: 'The phone number is not a valid Rwandan mobile number.',
  INVOICE_MISSING: 'No invoice number was sent with the payment request.',
  INVOICE_EXPIRED: 'This invoice has expired and can no longer be paid.',
  INVOICE_ALREADY_PAID: 'This invoice has already been paid.',
  INVOICE_ALREADY_IN_BATCH: 'This invoice belongs to a batch and cannot be paid on its own.',
  BAD_PAYMENT_PROVIDER: 'The payment provider must be MTN or AIRTEL.',
  PAYMENT_PROVIDER_ERROR:
    'The mobile network rejected the request — the number may be on a different network.',
  BAD_DATA: 'IremboPay rejected the request data. MoMo push is only available for RWF invoices.',
  // Ours
  TIMEOUT: 'IremboPay did not respond in time.',
  NETWORK_ERROR: 'IremboPay is unreachable.',
  BAD_RESPONSE: 'IremboPay returned a response we could not read.',
};

export function describeIremboError(code?: string, detail?: string): string {
  if (code && IREMBOPAY_ERROR_MESSAGES[code]) return IREMBOPAY_ERROR_MESSAGES[code];
  return detail || code || 'IremboPay returned an unspecified error.';
}

/**
 * A failed IremboPay call.
 *
 * Deliberately carries no request context beyond the URL — the secret key must
 * never reach a message, a log line, or a serialised error.
 */
export class IremboPayApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: string,
    readonly detail?: string,
    readonly url?: string,
  ) {
    super(message);
    this.name = 'IremboPayApiError';
  }

  /** 429 and 5xx are transient; a 4xx means the request itself is wrong. */
  get retryable(): boolean {
    return this.httpStatus === 429 || this.httpStatus >= 500;
  }
}

/**
 * Normalises a Rwandan mobile number to the local `07########` form.
 *
 * The IremboPay docs contradict themselves — the request table shows `07…`
 * while `BAD_PHONE_NUMBER` describes a 12-digit `250…`. This is the single
 * place that changes once sandbox settles it, which is why every caller goes
 * through here rather than formatting inline.
 */
export function normalizeMsisdn(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  if (digits.startsWith('250')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  // Bare subscriber number ("788123456") — restore the national trunk prefix.
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

/** True for a well-formed Rwandan mobile number in local form. */
export function isValidMsisdn(input: string): boolean {
  return /^07[2389]\d{7}$/.test(normalizeMsisdn(input));
}

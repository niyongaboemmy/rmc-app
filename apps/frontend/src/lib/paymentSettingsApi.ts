import { apiClient } from './api';

// ── Enums (mirrored from backend) ──────────────────────────────────────────────

/**
 * IremboPay is the only payment method. Historical
 * transactions carry the code, and admin listings must still render them.
 */
export type PaymentMethodCode = 'IREMBOPAY';

export type PaymentTypeKey =
  | 'DONATION'
  | 'MARRIAGE_FEE'
  | 'MEMBERSHIP_FEE'
  | 'SCHOOL_FEE'
  | 'EVENT_FEE'
  | 'ZAKAT';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  name: string;
  code: PaymentMethodCode;
  description: string | null;
  isActive: boolean;
  logoUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTypeRate {
  id: string;
  paymentTypeId: string;
  code: string | null;
  name: string;
  description: string | null;
  amount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentType {
  id: string;
  name: string;
  key: PaymentTypeKey;
  description: string | null;
  amount: number | null;
  isActive: boolean;
  rates: PaymentTypeRate[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePaymentTypePayload {
  name?: string;
  description?: string;
  amount?: number;
}

export interface UpsertPaymentTypeRatePayload {
  code?: string;
  name: string;
  description?: string;
  amount: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface PaymentMethodSettings {
  id: string;
  paymentMethodId: string;
  method: PaymentMethod;
  settings: Record<string, string>;
  isTestMode: boolean;
  isConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPaymentMethodSettingsPayload {
  settings: Record<string, string>;
  isTestMode?: boolean;
}

export interface PaymentTransaction {
  id: string;
  requestTransactionId: string;
  gatewayTransactionId: string | null;
  paymentMethodCode: string;
  paymentTypeKey: string | null;
  referenceId: string | null;
  amount: number;
  currency: string;
  mobilePhone: string;
  status: 'pending' | 'successful' | 'failed' | 'cancelled';
  responseCode: string | null;
  message: string | null;
  isTest: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── IremboPay ─────────────────────────────────────────────────────────────────

/** Which IremboPay merchant: products, accounts and keys differ between them. */
export type ProviderEnvironment = 'sandbox' | 'production';
export type ProviderCurrency = 'RWF' | 'USD' | 'EUR';
export const PROVIDER_CURRENCIES: readonly ProviderCurrency[] = ['RWF', 'USD', 'EUR'];

export interface ProviderProductRow {
  paymentTypeId: string;
  paymentTypeKey: string;
  paymentTypeName: string;
  paymentTypeActive: boolean;
  paymentTypeRateId: string | null;
  /** The mapping row's id, when mapped. */
  mappingId: string | null;
  currency: ProviderCurrency;
  environment: ProviderEnvironment;
  rateCode: string | null;
  rateName: string | null;
  amount: number | null;
  productCode: string | null;
  paymentAccountIdentifier: string | null;
  /**
   * True when an RWF charge for this row would fail for want of a product code.
   * Never set on USD/EUR rows: most services are simply not sold in those.
   */
  unmapped: boolean;
}

export interface UpsertProviderProductPayload {
  paymentTypeId: string;
  paymentTypeRateId?: string | null;
  productCode: string;
  paymentAccountIdentifier?: string | null;
  currency?: ProviderCurrency;
  environment?: ProviderEnvironment;
}

export interface IremboPayStatus {
  configured: boolean;
  /** Payments are being answered locally — no money moves and no call is made. */
  simulated: boolean;
  simulatorMode: 'off' | 'success' | 'fail' | 'pending';
  simulatorDelayMs: number;
  /** Default number the admin test panel pushes to. */
  testMsisdn: string;
  isTestMode: boolean;
  environment: ProviderEnvironment;
  apiBaseUrl: string;
  widgetScriptUrl: string;
  apiVersion: string;
  publicKey: string;
  paymentAccountIdentifier: string;
  paymentAccountIdentifierUsd: string;
  paymentAccountIdentifierEur: string;
  invoiceExpiryMinutes: number;
  defaultLanguage: 'EN' | 'FR' | 'RW';
  signatureToleranceSeconds: number;
  unmappedPaymentTypes: number;
}

export interface IremboPayTestPayload {
  amount?: number;
  currency?: ProviderCurrency;
  paymentTypeKey?: string;
  mobilePhone?: string;
  locale?: 'EN' | 'FR' | 'RW';
  paymentProvider?: 'MTN' | 'AIRTEL';
}

export interface IremboPayTestResult {
  transactionId: string;
  invoiceNumber: string;
  paymentLinkUrl?: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  responseCode?: string;
  message?: string;
  publicKey?: string;
  widgetScriptUrl?: string;
}

/** Payer-facing gateway capabilities. Contains no secrets by construction. */
export interface PublicPaymentConfig {
  provider: 'irembopay' | null;
  supportsWidget: boolean;
  supportsMomoPush: boolean;
  publicKey?: string;
  widgetScriptUrl?: string;
}

export interface UpdatePaymentMethodPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  logoUrl?: string;
  sortOrder?: number;
}

// ── Field schema per payment method (drives the settings form) ─────────────────

export interface SettingField {
  key: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  required?: boolean;
  type?: 'text' | 'url' | 'select';
  options?: { value: string; label: string }[];
  hint?: string;
}

/**
 * Removed methods have no entry: they cannot be configured, so there is nothing left
 * to configure. `Partial` rather than `Record` so the type says that out loud.
 */
export const PAYMENT_METHOD_FIELDS: Partial<Record<PaymentMethodCode, SettingField[]>> = {
  IREMBOPAY: [
    { key: 'secretKey', label: 'Secret Key', required: true, sensitive: true,
      placeholder: 'From Portal → Integration Details → View Token' },
    { key: 'publicKey', label: 'Public Key', required: true,
      hint: 'Used by the inline payment widget in the browser' },
    { key: 'paymentAccountIdentifier', label: 'Payment Account (RWF)', required: true,
      placeholder: 'e.g. RMC_RWF', hint: 'Determines the invoice currency. Sandbox: RMC-RWF' },
    { key: 'paymentAccountIdentifierUsd', label: 'Payment Account (USD)', placeholder: 'e.g. RMC_USD',
      hint: 'Leave empty to refuse USD payments' },
    { key: 'paymentAccountIdentifierEur', label: 'Payment Account (EUR)', placeholder: 'e.g. RMC_EUR',
      hint: 'Leave empty to refuse EUR payments' },
    { key: 'apiBaseUrl', label: 'API Base URL', type: 'url',
      placeholder: 'https://api.sandbox.irembopay.com',
      hint: 'Leave empty to derive from the Test mode toggle' },
    { key: 'widgetScriptUrl', label: 'Widget Script URL', type: 'url',
      placeholder: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
      hint: 'Leave empty to derive from the Test mode toggle' },
    { key: 'apiVersion', label: 'API Version', type: 'select',
      options: [
        { value: '3', label: 'v3 (partial payments)' },
        { value: '2', label: 'v2' },
        { value: '1', label: 'v1' },
      ] },
    { key: 'callbackUrl', label: 'Callback URL', type: 'url',
      placeholder: 'https://api.rwandamuslim.org/api/v1/webhooks/irembopay',
      hint: 'Copy this into the IremboPay portal — we do not send it per request' },
    { key: 'invoiceExpiryMinutes', label: 'Invoice Expiry (minutes)', placeholder: '1440' },
    { key: 'defaultLanguage', label: 'Invoice Language', type: 'select',
      options: [
        { value: 'EN', label: 'English' },
        { value: 'RW', label: 'Kinyarwanda' },
        { value: 'FR', label: 'French' },
      ] },
    { key: 'signatureToleranceSeconds', label: 'Signature Tolerance (seconds)', placeholder: '300' },
    { key: 'simulatorMode', label: 'Simulated payments', type: 'select',
      options: [
        { value: 'off',     label: 'Off — call the real IremboPay' },
        { value: 'success', label: 'Simulate — payment succeeds' },
        { value: 'fail',    label: 'Simulate — payment fails' },
        { value: 'pending', label: 'Simulate — payer never responds' },
      ],
      hint: 'Answer payments locally so the flow can be exercised with no credentials. Test mode only — always off in production.' },
    { key: 'simulatorDelayMs', label: 'Simulated approval delay (ms)', placeholder: '5000',
      hint: 'How long the simulated payer takes to approve.' },
    { key: 'testMsisdn', label: 'Test MoMo number', placeholder: '0781234567',
      hint: "Default number the Testing tab pushes to. IremboPay's sandbox accepts only their own test number." },
  ],
};

// ── Display helpers ────────────────────────────────────────────────────────────

export const METHOD_LABELS: Record<PaymentMethodCode, string> = {
  IREMBOPAY: 'IremboPay',
};

/**
 * Codes that existed before the platform settled on a single gateway. Archived
 * transactions still carry them, so the admin list needs a label — but they are
 * not offerable, which is why they are not in `PaymentMethodCode`.
 */
export const ARCHIVED_METHOD_LABELS: Record<string, string> = {
  MOMO_INTOUCH: 'Mobile Money (IntouchPay — retired)',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card Payment',
  CASH: 'Cash',
};

/** A method's display name, falling back to an archived one, then the raw code. */
export function methodLabel(code: string): string {
  return (
    METHOD_LABELS[code as PaymentMethodCode] ?? ARCHIVED_METHOD_LABELS[code] ?? code
  );
}

export const TYPE_LABELS: Record<PaymentTypeKey, string> = {
  DONATION:       'Donations',
  MARRIAGE_FEE:   'Marriage Fees',
  MEMBERSHIP_FEE: 'Membership Fees',
  SCHOOL_FEE:     'School Fees',
  EVENT_FEE:      'Event Registration',
  ZAKAT:          'Zakat',
};

// ── API ────────────────────────────────────────────────────────────────────────

export const paymentSettingsApi = {
  // Payment Methods
  listMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await apiClient.get('/admin/payment-settings/methods');
    return data.data ?? data;
  },

  updateMethod: async (id: string, payload: UpdatePaymentMethodPayload): Promise<PaymentMethod> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/methods/${id}`, payload);
    return data.data ?? data;
  },

  toggleMethod: async (id: string): Promise<PaymentMethod> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/methods/${id}/toggle`);
    return data.data ?? data;
  },

  // Payment Types
  listTypes: async (): Promise<PaymentType[]> => {
    const { data } = await apiClient.get('/admin/payment-settings/types');
    return data.data ?? data;
  },

  toggleType: async (id: string): Promise<PaymentType> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/types/${id}/toggle`);
    return data.data ?? data;
  },

  updateType: async (id: string, payload: UpdatePaymentTypePayload): Promise<PaymentType> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/types/${id}`, payload);
    return data.data ?? data;
  },

  // Rates
  listRates: async (typeId: string): Promise<PaymentTypeRate[]> => {
    const { data } = await apiClient.get(`/admin/payment-settings/types/${typeId}/rates`);
    return data.data ?? data;
  },

  createRate: async (typeId: string, payload: UpsertPaymentTypeRatePayload): Promise<PaymentTypeRate> => {
    const { data } = await apiClient.post(`/admin/payment-settings/types/${typeId}/rates`, payload);
    return data.data ?? data;
  },

  updateRate: async (typeId: string, rateId: string, payload: UpsertPaymentTypeRatePayload): Promise<PaymentTypeRate> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/types/${typeId}/rates/${rateId}`, payload);
    return data.data ?? data;
  },

  toggleRate: async (typeId: string, rateId: string): Promise<PaymentTypeRate> => {
    const { data } = await apiClient.patch(`/admin/payment-settings/types/${typeId}/rates/${rateId}/toggle`);
    return data.data ?? data;
  },

  deleteRate: async (typeId: string, rateId: string): Promise<void> => {
    await apiClient.delete(`/admin/payment-settings/types/${typeId}/rates/${rateId}`);
  },

  // Method Settings
  getMethodSettings: async (methodId: string): Promise<PaymentMethodSettings> => {
    const { data } = await apiClient.get(`/admin/payment-settings/methods/${methodId}/settings`);
    return data.data ?? data;
  },

  upsertMethodSettings: async (
    methodId: string,
    payload: UpsertPaymentMethodSettingsPayload,
  ): Promise<PaymentMethodSettings> => {
    const { data } = await apiClient.put(
      `/admin/payment-settings/methods/${methodId}/settings`,
      payload,
    );
    return data.data ?? data;
  },

  // Payment Testing
  checkTransactionStatus: async (txId: string): Promise<{ transaction: PaymentTransaction; gatewayStatus: string; message: string }> => {
    const { data } = await apiClient.get(`/admin/payment-settings/test/payment/${txId}/status`);
    return data.data ?? data;
  },

  listTransactions: async (filters?: {
    isTest?: boolean;
    paymentMethodCode?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PaymentTransaction[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get('/admin/payment-settings/transactions', { params: filters });
    return data.data ?? data;
  },

  // ── IremboPay ───────────────────────────────────────────────────────────────

  getIremboPayStatus: async (): Promise<IremboPayStatus> => {
    const { data } = await apiClient.get('/admin/payment-settings/irembopay/status');
    return data.data ?? data;
  },

  /** Omit `environment` for the merchant the gateway is on now. */
  listProviderProducts: async (
    provider = 'irembopay',
    environment?: ProviderEnvironment,
  ): Promise<ProviderProductRow[]> => {
    const { data } = await apiClient.get(`/admin/payment-settings/providers/${provider}/products`, {
      params: environment ? { environment } : undefined,
    });
    return data.data ?? data;
  },

  upsertProviderProduct: async (
    payload: UpsertProviderProductPayload,
    provider = 'irembopay',
  ): Promise<{ id: string }> => {
    const { data } = await apiClient.put(
      `/admin/payment-settings/providers/${provider}/products`,
      payload,
    );
    return data.data ?? data;
  },

  deleteProviderProduct: async (id: string, provider = 'irembopay'): Promise<void> => {
    await apiClient.delete(`/admin/payment-settings/providers/${provider}/products/${id}`);
  },

  testIremboPayInvoice: async (payload: IremboPayTestPayload = {}): Promise<IremboPayTestResult> => {
    const { data } = await apiClient.post('/admin/payment-settings/test/irembopay/invoice', payload);
    return data.data ?? data;
  },

  testIremboPayPush: async (payload: IremboPayTestPayload = {}): Promise<IremboPayTestResult> => {
    const { data } = await apiClient.post('/admin/payment-settings/test/irembopay/push', payload);
    return data.data ?? data;
  },

  // ── Payer-facing (public, no auth) ─────────────────────────────────────────

  getPublicPaymentConfig: async (): Promise<PublicPaymentConfig> => {
    const { data } = await apiClient.get('/payments/config');
    return data.data ?? data;
  },

  getPaymentStatus: async (
    transactionId: string,
  ): Promise<{ status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' }> => {
    const { data } = await apiClient.get(`/payments/status/${encodeURIComponent(transactionId)}`);
    return data.data ?? data;
  },

  recheckIremboPayInvoice: async (reference: string): Promise<{ status: string; message?: string }> => {
    const { data } = await apiClient.post(
      `/admin/payment-settings/test/irembopay/recheck/${encodeURIComponent(reference)}`,
    );
    return data.data ?? data;
  },
};

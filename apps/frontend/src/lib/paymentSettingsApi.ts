import { apiClient } from './api';

// ── Enums (mirrored from backend) ──────────────────────────────────────────────

export type PaymentMethodCode = 'MOMO_INTOUCH' | 'BANK_TRANSFER' | 'CARD' | 'CASH';

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

export interface TestPaymentPayload {
  mobilePhone: string;
  amount: number;
  paymentTypeKey?: PaymentTypeKey;
  currency?: string;
}

export interface TestDepositPayload {
  mobilePhone: string;
  amount: number;
  reason?: string;
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
  direction: 'collect' | 'deposit';
  responseCode: string | null;
  message: string | null;
  isTest: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestPaymentResult {
  transaction: PaymentTransaction;
  responseCode: string;
  message: string;
}

export interface TestDepositResult {
  transaction: PaymentTransaction;
  responseCode: string;
  message: string;
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

export const PAYMENT_METHOD_FIELDS: Record<PaymentMethodCode, SettingField[]> = {
  MOMO_INTOUCH: [
    { key: 'username',        label: 'Username',         placeholder: 'e.g. testa004',                     required: true },
    { key: 'partnerPassword', label: 'Partner Password', placeholder: 'Partner password from IntouchPay',  required: true, sensitive: true },
    { key: 'accountNo',       label: 'Account No.',      placeholder: 'e.g. 250260008866',                 required: true },
    { key: 'callbackUrl',     label: 'Callback URL',     placeholder: 'https://api.rmc.org.rw/webhooks/intouch', type: 'url',
      hint: 'IntouchPay will POST the transaction status to this URL after confirmation' },
    { key: 'gatewayUrl',      label: 'Gateway URL',      placeholder: 'https://www.intouchpay.co.rw/api/requestpayment/',
      hint: 'Leave empty to use the default IntouchPay endpoint', type: 'url' },
  ],
  BANK_TRANSFER: [
    { key: 'bankName',      label: 'Bank Name',       placeholder: 'e.g. Bank of Kigali',  required: true },
    { key: 'accountName',   label: 'Account Name',    placeholder: 'Rwanda Muslim Community', required: true },
    { key: 'accountNumber', label: 'Account Number',  placeholder: 'e.g. 00040-00612345-01', required: true },
    { key: 'branchCode',    label: 'Branch Code',     placeholder: 'e.g. KGL001' },
    { key: 'swiftCode',     label: 'SWIFT / BIC',     placeholder: 'e.g. BKIGRWRW' },
    { key: 'instructions',  label: 'Payment Instructions', placeholder: 'Optional notes shown to payers', type: 'text' },
  ],
  CARD: [
    { key: 'provider',       label: 'Provider',         required: true, type: 'select',
      options: [{ value: 'stripe', label: 'Stripe' }, { value: 'paystack', label: 'Paystack' }] },
    { key: 'publishableKey', label: 'Publishable Key',  placeholder: 'pk_live_...',   required: true },
    { key: 'secretKey',      label: 'Secret Key',       placeholder: 'sk_live_...',   required: true, sensitive: true },
    { key: 'webhookSecret',  label: 'Webhook Secret',   placeholder: 'whsec_...',     sensitive: true,
      hint: 'Used to verify webhook signatures from the payment provider' },
  ],
  CASH: [
    { key: 'instructions',  label: 'Payment Instructions', placeholder: 'e.g. Visit our office at KN 5 Rd...', type: 'text' },
    { key: 'contactPhone',  label: 'Contact Phone',        placeholder: '+250 7XX XXX XXX' },
  ],
};

// ── Display helpers ────────────────────────────────────────────────────────────

export const METHOD_LABELS: Record<PaymentMethodCode, string> = {
  MOMO_INTOUCH:  'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CARD:          'Card Payment',
  CASH:          'Cash',
};

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
  testPayment: async (payload: TestPaymentPayload): Promise<TestPaymentResult> => {
    const { data } = await apiClient.post('/admin/payment-settings/test/payment', payload);
    return data.data ?? data;
  },

  testDeposit: async (payload: TestDepositPayload): Promise<TestDepositResult> => {
    const { data } = await apiClient.post('/admin/payment-settings/test/deposit', payload);
    return data.data ?? data;
  },

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

  getBalance: async (): Promise<{ balance: string; success: boolean; message?: string }> => {
    const { data } = await apiClient.get('/admin/payment-settings/balance');
    return data.data ?? data;
  },
};

import { apiClient } from './api';
import {
  paymentSettingsApi,
  PAYMENT_METHOD_FIELDS,
  METHOD_LABELS,
  PaymentMethodCode,
} from './paymentSettingsApi';

jest.mock('./api', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { data: {} } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    put: jest.fn().mockResolvedValue({ data: { data: {} } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
}));

const mockClient = apiClient as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

describe('paymentSettingsApi after the IntouchPay retirement', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * The backend deleted these routes. A client method that still calls them
   * would 404 at an admin with no explanation, so the surface has to go too.
   */
  describe('the retired client methods', () => {
    it.each(['testPayment', 'testDeposit', 'getBalance'])('no longer exposes %s', (method) => {
      expect((paymentSettingsApi as unknown as Record<string, unknown>)[method]).toBeUndefined();
    });

    it('keeps the provider-neutral transaction list and status check', () => {
      expect(typeof paymentSettingsApi.listTransactions).toBe('function');
      expect(typeof paymentSettingsApi.checkTransactionStatus).toBe('function');
    });
  });

  describe('the IremboPay test surface', () => {
    it('posts a push test to the IremboPay push route', async () => {
      await paymentSettingsApi.testIremboPayPush({ mobilePhone: '0781234567', amount: 100 });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/admin/payment-settings/test/irembopay/push',
        { mobilePhone: '0781234567', amount: 100 },
      );
    });

    it('posts an invoice-only test to the invoice route', async () => {
      await paymentSettingsApi.testIremboPayInvoice({ amount: 250 });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/admin/payment-settings/test/irembopay/invoice',
        { amount: 250 },
      );
    });

    /** The admin recovery for a callback that never arrived. */
    it('url-encodes the reference on a re-check', async () => {
      await paymentSettingsApi.recheckIremboPayInvoice('DON-abc/123');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/admin/payment-settings/test/irembopay/recheck/DON-abc%2F123',
      );
    });

    /**
     * The status route kept its path when it moved controllers on the backend,
     * so this pins the URL the admin panel actually calls.
     */
    it('checks a transaction status on the unchanged settings path', async () => {
      await paymentSettingsApi.checkTransactionStatus('tx-1');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/admin/payment-settings/test/payment/tx-1/status',
      );
    });
  });

  /**
   * The archival keeps. Historical transactions carry MOMO_INTOUCH, and admin
   * listings join on it — the vocabulary outlives the gateway.
   */
  describe('the archive', () => {
    it('has no credential form for the retired gateway', () => {
      expect(PAYMENT_METHOD_FIELDS.MOMO_INTOUCH).toBeUndefined();
      expect(PAYMENT_METHOD_FIELDS.IREMBOPAY).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'secretKey', sensitive: true })]),
      );
    });

    it('still labels the retired method, and says it is retired', () => {
      const label = METHOD_LABELS['MOMO_INTOUCH' as PaymentMethodCode];

      expect(label).toBeDefined();
      expect(label).toMatch(/retired/i);
    });

    it('keeps every live method labelled', () => {
      for (const code of ['IREMBOPAY', 'BANK_TRANSFER', 'CARD', 'CASH'] as PaymentMethodCode[]) {
        expect(METHOD_LABELS[code]).toBeTruthy();
      }
    });
  });
});

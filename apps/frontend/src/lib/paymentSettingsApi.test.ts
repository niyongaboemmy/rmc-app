import { apiClient } from './api';
import {
  paymentSettingsApi,
  PAYMENT_METHOD_FIELDS,
  METHOD_LABELS,
  methodLabel,
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
   * IremboPay is the only way to pay. Manual bank transfer went with it: the
   * sheet already offers a bank channel, and that one reconciles itself where a
   * hand-typed account number did not.
   */
  describe('the offerable methods', () => {
    it('offers IremboPay and nothing else', () => {
      expect(Object.keys(METHOD_LABELS)).toEqual(['IREMBOPAY']);
    });

    it('has a credential form for IremboPay and none for the removed gateways', () => {
      expect(PAYMENT_METHOD_FIELDS.IREMBOPAY).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'secretKey', sensitive: true })]),
      );
      for (const gone of ['MOMO_INTOUCH', 'CARD', 'CASH', 'BANK_TRANSFER']) {
        expect((PAYMENT_METHOD_FIELDS as Record<string, unknown>)[gone]).toBeUndefined();
      }
    });

    /**
     * Archived transactions still carry the removed codes, so a label must
     * exist — otherwise the admin ledger shows a bare enum to a human.
     */
    it('still labels an archived transaction, without offering the method', () => {
      expect(methodLabel('MOMO_INTOUCH')).toMatch(/retired/i);
      expect(methodLabel('CARD')).toBe('Card Payment');
      expect(methodLabel('BANK_TRANSFER')).toBe('Bank Transfer');
      expect(methodLabel('IREMBOPAY')).toBe('IremboPay');
    });

    it('falls back to the raw code rather than rendering nothing', () => {
      expect(methodLabel('SOMETHING_UNKNOWN')).toBe('SOMETHING_UNKNOWN');
    });
  });
});

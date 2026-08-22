import { BadRequestException } from '@nestjs/common';
import { IntouchPayProvider } from './intouch-pay.provider';
import { PaymentChargeRequest } from '../payment-gateway.port';

const CREDS = {
  username: 'testa004',
  partnerPassword: 'secret',
  accountNo: '250260008866',
};

const REQUEST: PaymentChargeRequest = {
  transactionId: 'DON-abc12345-1',
  amount: 5000,
  currency: 'RWF',
  paymentTypeKey: 'DONATION',
  payer: { name: 'Test Donor', phone: '0781234567' },
  description: 'RMC Donation',
};

function build(
  opts: { creds?: Record<string, string> | null; result?: Record<string, unknown> } = {},
) {
  const intouchPay = {
    requestPayment: jest.fn().mockResolvedValue(
      opts.result ?? {
        requestTransactionId: 'DON-abc12345-1',
        transactionId: 'GW-99',
        status: 'PENDING',
        responseCode: '1000',
        message: 'Pending',
      },
    ),
    getTransactionStatus: jest.fn().mockResolvedValue({
      status: 'SUCCESSFUL',
      responseCode: '01',
      message: 'Successful',
    }),
  };
  const paymentSettings = {
    getRawSettings: jest.fn().mockResolvedValue(opts.creds === undefined ? CREDS : opts.creds),
  };
  const config = { get: jest.fn().mockReturnValue('https://api.example.rw') };

  return {
    provider: new IntouchPayProvider(
      intouchPay as never,
      paymentSettings as never,
      config as never,
    ),
    intouchPay,
    paymentSettings,
  };
}

describe('IntouchPayProvider', () => {
  describe('isConfigured', () => {
    it('is true only when username, password and account are all present', async () => {
      await expect(build().provider.isConfigured()).resolves.toBe(true);
      await expect(
        build({ creds: { ...CREDS, accountNo: '' } }).provider.isConfigured(),
      ).resolves.toBe(false);
      await expect(build({ creds: null }).provider.isConfigured()).resolves.toBe(false);
    });
  });

  describe('charge', () => {
    /**
     * The webhook services parse `requestTxnId|gatewayTxnId`. Changing this
     * format silently breaks callback matching for every historical record, so
     * it is pinned here rather than left to the adapter's discretion.
     */
    it('preserves the requestTxnId|gatewayTxnId reference format', async () => {
      const { provider } = build();

      const result = await provider.charge(REQUEST);

      expect(result.providerReference).toBe('DON-abc12345-1|GW-99');
      expect(result.provider).toBe('intouchpay');
      // The invariant every provider must honour: whatever a domain record
      // persists begins with our transactionId, because that is what the
      // callback carries back and what the webhook services match on.
      expect(result.domainReference.startsWith('DON-abc12345-1')).toBe(true);
    });

    it('falls back to the bare transaction id when the gateway returns none', async () => {
      const { provider } = build({
        result: { transactionId: '', status: 'PENDING', responseCode: '1000', message: 'Pending' },
      });

      const result = await provider.charge(REQUEST);

      expect(result.providerReference).toBe('DON-abc12345-1');
      expect(result.domainReference).toBe('DON-abc12345-1');
      expect(result.domainReference.startsWith(REQUEST.transactionId)).toBe(true);
    });

    it('passes the payer phone and amount straight through', async () => {
      const { provider, intouchPay } = build();

      await provider.charge(REQUEST);

      expect(intouchPay.requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          mobilePhone: '0781234567',
          transactionId: 'DON-abc12345-1',
          username: CREDS.username,
        }),
      );
    });

    it('refuses to charge without credentials, naming where to set them', async () => {
      const { provider, intouchPay } = build({ creds: null });

      await expect(provider.charge(REQUEST)).rejects.toBeInstanceOf(BadRequestException);
      await expect(provider.charge(REQUEST)).rejects.toThrow(/Settings/);
      expect(intouchPay.requestPayment).not.toHaveBeenCalled();
    });

    /** IntouchPay is MoMo-only — a card payer with no MSISDN cannot be charged. */
    it('refuses to charge without a phone number', async () => {
      const { provider, intouchPay } = build();

      await expect(provider.charge({ ...REQUEST, payer: {} })).rejects.toThrow(/phone/i);
      expect(intouchPay.requestPayment).not.toHaveBeenCalled();
    });

    it('carries a terminal gateway status through unchanged', async () => {
      const { provider } = build({
        result: {
          transactionId: 'GW-1',
          status: 'FAILED',
          responseCode: '1005',
          message: 'Insufficient funds',
        },
      });

      const result = await provider.charge(REQUEST);

      expect(result).toMatchObject({ status: 'FAILED', responseCode: '1005' });
    });
  });

  describe('getStatus', () => {
    it('splits the stored reference back into its two ids', async () => {
      const { provider, intouchPay } = build();

      await provider.getStatus('DON-abc12345-1|GW-99');

      expect(intouchPay.getTransactionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          requestTransactionId: 'DON-abc12345-1',
          transactionId: 'GW-99',
        }),
      );
    });

    it('uses the request id for both when no gateway id was ever stored', async () => {
      const { provider, intouchPay } = build();

      await provider.getStatus('DON-abc12345-1');

      expect(intouchPay.getTransactionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          requestTransactionId: 'DON-abc12345-1',
          transactionId: 'DON-abc12345-1',
        }),
      );
    });

    it('reports a paid time only once the payment succeeded', async () => {
      const { provider } = build();

      const ok = await provider.getStatus('DON-abc12345-1|GW-99');
      expect(ok.status).toBe('SUCCESSFUL');
      expect(ok.paidAt).toBeInstanceOf(Date);
    });
  });
});

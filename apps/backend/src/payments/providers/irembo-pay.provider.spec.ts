import { BadRequestException } from '@nestjs/common';
import { IremboPayProvider } from './irembo-pay.provider';
import { IremboPayApiError, IremboInvoice } from '../../integrations/irembo-pay/irembo-pay.types';
import { IremboPayConfig } from '../../integrations/irembo-pay/irembo-pay.config.service';
import { PaymentChargeRequest } from '../payment-gateway.port';

const CONFIG: IremboPayConfig = {
  secretKey: 'sk_test',
  publicKey: 'pk_test',
  paymentAccountIdentifier: 'TST-RWF',
  paymentAccountIdentifierUsd: '',
  paymentAccountIdentifierEur: '',
  environment: 'sandbox',
  apiBaseUrl: 'https://api.sandbox.irembopay.com',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  apiVersion: '3',
  invoiceExpiryMinutes: 1440,
  defaultLanguage: 'EN',
  signatureToleranceSeconds: 300,
  simulatorMode: 'off' as const,
  simulatorDelayMs: 5000,
  testMsisdn: '0781234567',
  isTestMode: true,
};

const INVOICE: IremboInvoice = {
  invoiceNumber: '880519183280',
  transactionId: 'DON-abc12345-1',
  paymentAccountIdentifier: 'TST-RWF',
  paymentItems: [{ code: 'PI-3e5fe23f2d', quantity: 1, unitAmount: 5000 }],
  paymentStatus: 'NEW',
  amount: 5000,
  currency: 'RWF',
  paymentLinkUrl: 'https://pay.irembopay.com/880519183280',
};

const REQUEST: PaymentChargeRequest = {
  transactionId: 'DON-abc12345-1',
  amount: 5000,
  currency: 'RWF',
  paymentTypeKey: 'DONATION',
  referenceId: '11111111-1111-1111-1111-111111111111',
  payer: { name: 'Test Payer', phone: '0781234567' },
  pushProvider: 'MTN',
};

function build(
  overrides: {
    createInvoice?: jest.Mock;
    getInvoice?: jest.Mock;
    initiateMomoPush?: jest.Mock;
    resolveForCharge?: jest.Mock;
    config?: Partial<IremboPayConfig>;
    accountForCurrency?: jest.Mock;
    storedStatus?: 'NEW' | 'PAID' | 'PARTIALLY_PAID' | 'EXPIRED';
  } = {},
) {
  const irembo = {
    createInvoice: overrides.createInvoice ?? jest.fn().mockResolvedValue(INVOICE),
    getInvoice: overrides.getInvoice ?? jest.fn().mockResolvedValue(INVOICE),
    initiateMomoPush:
      overrides.initiateMomoPush ?? jest.fn().mockResolvedValue({ referenceId: 'R1' }),
    formatExpiry: jest.fn().mockReturnValue('2026-08-22T16:24:51.000+02:00'),
    defaultExpiry: jest.fn().mockResolvedValue('2026-08-22T16:24:51.000+02:00'),
  };

  const config = {
    get: jest.fn().mockResolvedValue({ ...CONFIG, ...overrides.config }),
    isConfigured: jest.fn().mockResolvedValue(true),
    accountForCurrency: overrides.accountForCurrency ?? jest.fn().mockResolvedValue('TST-RWF'),
  };

  const recordNewInvoice = jest.fn(async (remote: IremboInvoice) => ({
    transactionId: remote.transactionId,
    invoiceNumber: remote.invoiceNumber,
    paymentStatus: overrides.storedStatus ?? remote.paymentStatus,
    paymentLinkUrl: remote.paymentLinkUrl ?? null,
  }));

  const invoices = {
    recordNewInvoice,
    applyInvoiceState: jest.fn().mockResolvedValue(null),
  };

  const products = {
    resolveForCharge:
      overrides.resolveForCharge ??
      jest.fn().mockResolvedValue({ productCode: 'PI-3e5fe23f2d', paymentAccountIdentifier: null }),
  };

  return {
    provider: new IremboPayProvider(
      irembo as never,
      config as never,
      invoices as never,
      products as never,
    ),
    irembo,
    config,
    invoices,
    products,
    recordNewInvoice,
  };
}

describe('IremboPayProvider', () => {
  it('creates an invoice, persists it, pushes MoMo and returns widget details', async () => {
    const { provider, irembo, recordNewInvoice } = build();

    const result = await provider.charge(REQUEST);

    expect(irembo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'DON-abc12345-1',
        paymentAccountIdentifier: 'TST-RWF',
        paymentItems: [{ code: 'PI-3e5fe23f2d', quantity: 1, unitAmount: 5000 }],
        language: 'EN',
      }),
    );
    expect(recordNewInvoice).toHaveBeenCalled();
    expect(irembo.initiateMomoPush).toHaveBeenCalledWith({
      accountIdentifier: '0781234567',
      paymentProvider: 'MTN',
      invoiceNumber: '880519183280',
    });

    expect(result).toMatchObject({
      provider: 'irembopay',
      status: 'PENDING',
      providerReference: '880519183280',
      transactionId: 'DON-abc12345-1',
      paymentLinkUrl: 'https://pay.irembopay.com/880519183280',
      publicKey: 'pk_test',
      widgetScriptUrl: CONFIG.widgetScriptUrl,
    });
  });

  /**
   * Regression: donations persisted `providerReference` — IremboPay's invoice
   * number — but the callback carries our `transactionId`, so the webhook never
   * matched and paid donations stayed pending forever.
   */
  it('returns our transactionId as the domain reference, not the invoice number', async () => {
    const { provider } = build();

    const result = await provider.charge(REQUEST);

    expect(result.domainReference).toBe('DON-abc12345-1');
    expect(result.domainReference).not.toBe(result.providerReference);
  });

  it('bills a multi-line cart as one invoice with one payment item per line', async () => {
    const { provider, irembo } = build();

    await provider.charge({
      ...REQUEST,
      amount: 10000,
      items: [
        { paymentTypeKey: 'DONATION', amount: 5000, quantity: 1 },
        { paymentTypeKey: 'DONATION', amount: 3000, quantity: 1 },
        { paymentTypeKey: 'DONATION', amount: 2000, quantity: 2 },
      ],
    });

    const body = irembo.createInvoice.mock.calls[0][0];
    expect(body.paymentItems).toEqual([
      { code: 'PI-3e5fe23f2d', quantity: 1, unitAmount: 5000 },
      { code: 'PI-3e5fe23f2d', quantity: 1, unitAmount: 3000 },
      { code: 'PI-3e5fe23f2d', quantity: 2, unitAmount: 2000 },
    ]);
    // Never a total — IremboPay computes Σ(unitAmount × quantity) itself.
    expect(body.amount).toBeUndefined();
  });

  it('recovers the existing invoice on DUPLICATE_TRANSACTION_ID instead of failing', async () => {
    const createInvoice = jest
      .fn()
      .mockRejectedValue(new IremboPayApiError('duplicate', 400, 'DUPLICATE_TRANSACTION_ID'));
    const getInvoice = jest.fn().mockResolvedValue(INVOICE);
    const { provider, recordNewInvoice } = build({ createInvoice, getInvoice });

    const result = await provider.charge(REQUEST);

    expect(getInvoice).toHaveBeenCalledWith('DON-abc12345-1');
    expect(result.providerReference).toBe('880519183280');
    // Same invoice, one upsert — no duplicate row.
    expect(recordNewInvoice).toHaveBeenCalledTimes(1);
  });

  it('rethrows any error that is not a duplicate transaction id', async () => {
    const createInvoice = jest
      .fn()
      .mockRejectedValue(new IremboPayApiError('bad account', 400, 'PAYMENT_ACCOUNT_NOT_FOUND'));
    const { provider, irembo } = build({ createInvoice });

    await expect(provider.charge(REQUEST)).rejects.toMatchObject({
      code: 'PAYMENT_ACCOUNT_NOT_FOUND',
    });
    expect(irembo.getInvoice).not.toHaveBeenCalled();
  });

  it('names the Products tab when the payment type is unmapped', async () => {
    const resolveForCharge = jest
      .fn()
      .mockRejectedValue(
        new BadRequestException(
          'No irembopay product is mapped to "Donations" (DONATION). Map it in Admin → Settings → Payments → Products.',
        ),
      );
    const { provider, irembo } = build({ resolveForCharge });

    await expect(provider.charge(REQUEST)).rejects.toThrow(/Products/);
    expect(irembo.createInvoice).not.toHaveBeenCalled();
  });

  it('leaves a payable invoice when the MoMo push fails', async () => {
    const initiateMomoPush = jest
      .fn()
      .mockRejectedValue(new IremboPayApiError('network error', 500, 'PAYMENT_PROVIDER_ERROR'));
    const { provider } = build({ initiateMomoPush });

    const result = await provider.charge(REQUEST);

    expect(result.status).toBe('PENDING');
    expect(result.providerReference).toBe('880519183280');
    expect(result.paymentLinkUrl).toBeDefined();
    expect(result.message).toMatch(/still payable by card, bank or payment link/);
    expect(result.responseCode).toBe('PAYMENT_PROVIDER_ERROR');
  });

  it('skips the push for a malformed phone number but still issues the invoice', async () => {
    const { provider, irembo } = build();

    const result = await provider.charge({ ...REQUEST, payer: { phone: '12345' } });

    expect(irembo.initiateMomoPush).not.toHaveBeenCalled();
    expect(result.status).toBe('PENDING');
    expect(result.responseCode).toBe('BAD_PHONE_NUMBER');
    expect(result.message).toMatch(/still payable/);
  });

  it('does not push against an invoice that is already paid', async () => {
    const { provider, irembo } = build({ storedStatus: 'PAID' });

    const result = await provider.charge(REQUEST);

    expect(irembo.initiateMomoPush).not.toHaveBeenCalled();
    expect(result.status).toBe('SUCCESSFUL');
  });

  it('omits the push entirely when no pushProvider is requested', async () => {
    const { provider, irembo } = build();

    const result = await provider.charge({ ...REQUEST, pushProvider: undefined });

    expect(irembo.initiateMomoPush).not.toHaveBeenCalled();
    expect(result.status).toBe('PENDING');
    expect(result.message).toMatch(/Invoice 880519183280 created/);
  });

  describe('currency and environment', () => {
    const PRODUCTION = { environment: 'production' as const, isTestMode: false };
    const accounts = jest.fn(async (ccy: string) => `RMC_${ccy}`);
    const catalog = jest.fn(
      async (_provider: string, key: string, scope: { currency: string; environment: string }) => ({
        productCode: `${key}-${scope.currency}-${scope.environment}`,
        paymentAccountIdentifier: null,
      }),
    );

    /** IremboPay answers BAD_DATA for a non-RWF push; we refuse before invoicing. */
    it.each(['USD', 'EUR'])('refuses a %s MoMo push before any HTTP call', async (currency) => {
      const { provider, irembo } = build({ config: PRODUCTION });

      await expect(
        provider.charge({ ...REQUEST, currency, pushProvider: 'MTN' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(irembo.createInvoice).not.toHaveBeenCalled();
      expect(irembo.initiateMomoPush).not.toHaveBeenCalled();
    });

    it('resolves products in the charge currency on the live merchant', async () => {
      const { provider, products } = build({
        config: PRODUCTION,
        resolveForCharge: catalog,
        accountForCurrency: accounts,
      });

      await provider.charge({ ...REQUEST, currency: 'usd', pushProvider: undefined });

      expect(products.resolveForCharge).toHaveBeenCalledWith('irembopay', 'DONATION', {
        rateId: undefined,
        currency: 'USD',
        environment: 'production',
      });
    });

    it('bills a EUR basket of Sadaqat and Zakat as one RMC_EUR invoice', async () => {
      const { provider, irembo, recordNewInvoice } = build({
        config: PRODUCTION,
        resolveForCharge: catalog,
        accountForCurrency: accounts,
      });

      await provider.charge({
        ...REQUEST,
        amount: 75,
        currency: 'EUR',
        pushProvider: undefined,
        items: [
          { paymentTypeKey: 'DONATION', amount: 50, quantity: 1 },
          { paymentTypeKey: 'ZAKAT', amount: 25, quantity: 1 },
        ],
      });

      expect(irembo.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentAccountIdentifier: 'RMC_EUR',
          paymentItems: [
            { code: 'DONATION-EUR-production', quantity: 1, unitAmount: 50 },
            { code: 'ZAKAT-EUR-production', quantity: 1, unitAmount: 25 },
          ],
        }),
      );
      expect(recordNewInvoice).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ environment: 'production', isTest: false }),
      );
    });

    /** The €50-as-50-RWF regression, end to end through the provider. */
    it('creates no invoice when the currency has no account', async () => {
      const { provider, irembo } = build({
        config: PRODUCTION,
        accountForCurrency: jest
          .fn()
          .mockRejectedValue(new BadRequestException('IremboPay has no EUR payment account')),
      });

      await expect(
        provider.charge({ ...REQUEST, currency: 'EUR', pushProvider: undefined }),
      ).rejects.toThrow(/no EUR payment account/);
      expect(irembo.createInvoice).not.toHaveBeenCalled();
    });

    it('records sandbox invoices as sandbox', async () => {
      const { provider, recordNewInvoice } = build();

      await provider.charge(REQUEST);

      expect(recordNewInvoice).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ environment: 'sandbox' }),
      );
    });
  });

  describe('getStatus', () => {
    it.each([
      ['PAID', 'SUCCESSFUL'],
      ['NEW', 'PENDING'],
      ['PARTIALLY_PAID', 'PENDING'],
      ['EXPIRED', 'FAILED'],
    ] as const)('maps %s to %s', async (paymentStatus, expected) => {
      const getInvoice = jest.fn().mockResolvedValue({ ...INVOICE, paymentStatus });
      const { provider } = build({ getInvoice });

      const status = await provider.getStatus('880519183280');
      expect(status.status).toBe(expected);
      expect(status.providerReference).toBe('880519183280');
    });

    it('carries the partial-payment balance through', async () => {
      const getInvoice = jest.fn().mockResolvedValue({
        ...INVOICE,
        paymentStatus: 'PARTIALLY_PAID',
        paidAmount: 2000,
        balance: 3000,
        paymentMethod: 'BK',
      });
      const { provider } = build({ getInvoice });

      const status = await provider.getStatus('DON-abc12345-1');

      expect(status).toMatchObject({
        status: 'PENDING',
        paidAmount: 2000,
        balance: 3000,
        providerPaymentMethod: 'BK',
      });
    });
  });
});

import { IremboPaySandboxService } from './irembopay-sandbox.service';
import { IremboPayConfigService, IremboPayConfig } from './irembo-pay.config.service';
import { IremboPayInvoiceService } from './irembopay-invoice.service';
import { IremboPayApiError } from './irembo-pay.types';

const baseConfig: IremboPayConfig = {
  secretKey: '',
  publicKey: '',
  paymentAccountIdentifier: '',
  paymentAccountIdentifierUsd: '',
  paymentAccountIdentifierEur: '',
  environment: 'sandbox',
  limits: {
    RWF: { perTransaction: 50_000_000, daily: 100_000_000 },
    USD: { perTransaction: 100_000, daily: 300_000 },
    EUR: { perTransaction: 100_000, daily: 300_000 },
  },
  apiBaseUrl: 'https://api.sandbox.irembopay.com',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  apiVersion: '3',
  invoiceExpiryMinutes: 1440,
  defaultLanguage: 'EN',
  signatureToleranceSeconds: 300,
  isTestMode: true,
  simulatorMode: 'success',
  simulatorDelayMs: 0,
  testMsisdn: '0781234567',
};

const invoiceInput = (transactionId = 'DON-abc12345-1') => ({
  transactionId,
  paymentAccountIdentifier: 'TST-RWF',
  paymentItems: [{ code: 'PC-DONATION-001', quantity: 2, unitAmount: 1500 }],
  customer: { name: 'Amina', phoneNumber: '0781234567' },
});

function build(overrides: Partial<IremboPayConfig> = {}) {
  const cfg = { ...baseConfig, ...overrides };
  const config = { get: jest.fn(async () => cfg) } as unknown as IremboPayConfigService;
  const applyInvoiceState = jest.fn(async () => ({ changed: true }));
  const invoices = { applyInvoiceState } as unknown as IremboPayInvoiceService;
  return { sandbox: new IremboPaySandboxService(config, invoices), applyInvoiceState, cfg };
}

describe('IremboPaySandboxService', () => {
  const realEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = realEnv;
  });

  describe('isActive', () => {
    it('is on in test mode with a simulator mode set', async () => {
      const { sandbox } = build();
      await expect(sandbox.isActive()).resolves.toBe(true);
    });

    it('is off when the mode is off', async () => {
      const { sandbox } = build({ simulatorMode: 'off' });
      await expect(sandbox.isActive()).resolves.toBe(false);
    });

    // Live credentials plus a simulator is how real invoices get marked paid
    // without money. Test mode is the second lock on that door.
    it('is off when the method is not in test mode', async () => {
      const { sandbox } = build({ isTestMode: false });
      await expect(sandbox.isActive()).resolves.toBe(false);
    });

    it('is off in production regardless of settings', async () => {
      process.env.NODE_ENV = 'production';
      const { sandbox } = build();
      await expect(sandbox.isActive()).resolves.toBe(false);
    });
  });

  describe('createInvoice', () => {
    it('totals the payment items rather than trusting a sent amount', async () => {
      const { sandbox } = build();
      const invoice = await sandbox.createInvoice(invoiceInput());

      expect(invoice.amount).toBe(3000);
      expect(invoice.paymentStatus).toBe('NEW');
      expect(invoice.transactionId).toBe('DON-abc12345-1');
      expect(invoice.invoiceNumber).toMatch(/^99\d{10}$/);
    });

    // The provider has a recovery path for this; simulating only the happy
    // case would leave it unexercised.
    it('rejects a reused transaction id the way the real API does', async () => {
      const { sandbox } = build({ simulatorMode: 'pending' });
      await sandbox.createInvoice(invoiceInput());

      await expect(sandbox.createInvoice(invoiceInput())).rejects.toMatchObject({
        code: 'DUPLICATE_TRANSACTION_ID',
      });
    });

    it('issues a link that cannot be mistaken for a payable one', async () => {
      const { sandbox } = build({ simulatorMode: 'pending' });
      const invoice = await sandbox.createInvoice(invoiceInput());

      expect(invoice.paymentLinkUrl).not.toMatch(/irembopay\.com/);
    });
  });

  describe('payment outcomes', () => {
    it('settles a successful payment through the shared invoice path', async () => {
      const { sandbox, applyInvoiceState } = build({
        simulatorMode: 'success',
        simulatorDelayMs: 0,
      });
      const created = await sandbox.createInvoice(invoiceInput());

      const read = await sandbox.getInvoice(created.invoiceNumber);

      expect(read.paymentStatus).toBe('PAID');
      expect(read.paidAmount).toBe(3000);
      expect(read.balance).toBe(0);
      expect(read.paymentMethod).toBe('MTN_MOMO');
      // Settlement must not be a second code path — it goes through the same
      // method the webhook and the reconciliation sweep use.
      await sandbox.resolveNow(created.invoiceNumber);
      expect(applyInvoiceState).toHaveBeenCalled();
    });

    it('expires an invoice in fail mode', async () => {
      const { sandbox } = build({ simulatorMode: 'fail', simulatorDelayMs: 0 });
      const created = await sandbox.createInvoice(invoiceInput());

      await expect(sandbox.getInvoice(created.invoiceNumber)).resolves.toMatchObject({
        paymentStatus: 'EXPIRED',
      });
    });

    it('leaves the invoice open forever in pending mode', async () => {
      const { sandbox } = build({ simulatorMode: 'pending' });
      const created = await sandbox.createInvoice(invoiceInput());

      await expect(sandbox.getInvoice(created.invoiceNumber)).resolves.toMatchObject({
        paymentStatus: 'NEW',
      });
    });

    it('does not re-settle an invoice that is already paid', async () => {
      const { sandbox, applyInvoiceState } = build({ simulatorDelayMs: 0 });
      const created = await sandbox.createInvoice(invoiceInput());

      await sandbox.resolveNow(created.invoiceNumber);
      await sandbox.resolveNow(created.invoiceNumber);

      expect(applyInvoiceState).toHaveBeenCalledTimes(1);
    });
  });

  describe('lookup', () => {
    it('resolves by our transaction id as well as the invoice number', async () => {
      const { sandbox } = build({ simulatorMode: 'pending' });
      const created = await sandbox.createInvoice(invoiceInput());

      await expect(sandbox.getInvoice('DON-abc12345-1')).resolves.toMatchObject({
        invoiceNumber: created.invoiceNumber,
      });
    });

    it('404s on an unknown reference', async () => {
      const { sandbox } = build();
      await expect(sandbox.getInvoice('nope')).rejects.toBeInstanceOf(IremboPayApiError);
    });
  });

  describe('momo push', () => {
    it('acknowledges a push without sending anything', async () => {
      const { sandbox } = build({ simulatorMode: 'pending' });
      const created = await sandbox.createInvoice(invoiceInput());

      const push = await sandbox.initiateMomoPush({
        accountIdentifier: '0781234567',
        paymentProvider: 'MTN',
        invoiceNumber: created.invoiceNumber,
      });

      expect(push).toMatchObject({ invoiceNumber: created.invoiceNumber, amount: 3000 });
    });

    it('404s a push at an unknown invoice', async () => {
      const { sandbox } = build();
      await expect(
        sandbox.initiateMomoPush({
          accountIdentifier: '0781234567',
          paymentProvider: 'MTN',
          invoiceNumber: 'nope',
        }),
      ).rejects.toBeInstanceOf(IremboPayApiError);
    });
  });
});

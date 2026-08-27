import { NotFoundException } from '@nestjs/common';
import { IremboPayAdminController } from './irembopay-admin.controller';
import { IremboPayConfig } from '../integrations/irembo-pay/irembo-pay.config.service';
import { PaymentTransactionStatus } from '../payment-settings/entities/payment-transaction.entity';
import { User } from '../users/entities/user.entity';

const SECRET = 'sk_test_MUST_NEVER_LEAVE_THE_SERVER';

const CONFIG: IremboPayConfig = {
  secretKey: SECRET,
  publicKey: 'pk_test_public',
  paymentAccountIdentifier: 'TST-RWF',
  paymentAccountIdentifierUsd: '',
  apiBaseUrl: 'https://api.sandbox.irembopay.com',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  apiVersion: '3',
  invoiceExpiryMinutes: 1440,
  defaultLanguage: 'EN',
  signatureToleranceSeconds: 300,
  isTestMode: true,
};

const ADMIN = {
  id: 'user-1',
  firstName: 'Amina',
  lastName: 'Uwase',
  email: 'amina@example.rw',
} as User;

function build(rows: unknown[] = [], txRows: unknown[] = []) {
  const products = {
    listRows: jest.fn().mockResolvedValue(rows),
    upsert: jest.fn().mockResolvedValue({ id: 'map-1' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const provider = {
    charge: jest.fn().mockResolvedValue({
      provider: 'irembopay',
      status: 'PENDING',
      providerReference: '880519183280',
      domainReference: 'TEST-1',
      transactionId: 'TEST-1',
      paymentLinkUrl: 'https://pay.sandbox.irembopay.com/880519183280',
      publicKey: 'pk_test_public',
      widgetScriptUrl: CONFIG.widgetScriptUrl,
      responseCode: 'NEW',
      message: 'Invoice created',
    }),
    getStatus: jest.fn().mockResolvedValue({ status: 'SUCCESSFUL' }),
  };
  const config = {
    get: jest.fn().mockResolvedValue(CONFIG),
    isConfigured: jest.fn().mockResolvedValue(true),
  };
  const invoices = {
    findByInvoiceNumber: jest.fn().mockResolvedValue(null),
    findByTransactionId: jest.fn().mockResolvedValue({ transactionId: 'TEST-1' }),
  };

  const gateway = {
    getStatus: jest.fn().mockResolvedValue({
      status: 'SUCCESSFUL',
      providerReference: '880519183280',
      message: 'Paid via MTN_MOMO',
    }),
  };

  // findOne returns the rows in order, so a test can hand back the pending row
  // first and the row as the invoice service left it on the re-read.
  const queue = [...txRows];
  const txRepo = {
    findOne: jest.fn().mockImplementation(() => Promise.resolve(queue.shift() ?? null)),
  };

  return {
    controller: new IremboPayAdminController(
      products as never,
      provider as never,
      config as never,
      invoices as never,
      gateway as never,
      txRepo as never,
    ),
    products,
    provider,
    invoices,
    gateway,
    txRepo,
  };
}

describe('IremboPayAdminController', () => {
  describe('status', () => {
    it('reports the resolved configuration without the secret key', async () => {
      const { controller } = build();

      const status = await controller.status();

      expect(status).toMatchObject({
        configured: true,
        isTestMode: true,
        apiBaseUrl: CONFIG.apiBaseUrl,
        publicKey: 'pk_test_public',
      });
      expect(JSON.stringify(status)).not.toContain(SECRET);
      expect(JSON.stringify(status)).not.toContain('secretKey');
    });

    /** An unmapped type fails at charge time; the admin should see it first. */
    it('counts payment types with no product mapping', async () => {
      const { controller } = build([
        { paymentTypeRateId: null, unmapped: true },
        { paymentTypeRateId: null, unmapped: false },
        // Rate-level rows are excluded — a rate inherits its type's mapping.
        { paymentTypeRateId: 'rate-1', unmapped: true },
      ]);

      await expect(controller.status()).resolves.toMatchObject({ unmappedPaymentTypes: 1 });
    });
  });

  describe('product mapping', () => {
    it('lists rows for the requested provider', async () => {
      const { controller, products } = build();

      await controller.listProducts('irembopay');

      expect(products.listRows).toHaveBeenCalledWith('irembopay');
    });

    it('upserts a type-level mapping when no rate is given', async () => {
      const { controller, products } = build();

      await controller.upsertProduct('irembopay', {
        paymentTypeId: 'type-1',
        productCode: 'PI-3e5fe23f2d',
      });

      expect(products.upsert).toHaveBeenCalledWith('irembopay', {
        paymentTypeId: 'type-1',
        paymentTypeRateId: null,
        productCode: 'PI-3e5fe23f2d',
        paymentAccountIdentifier: null,
      });
    });

    it('passes a rate id and account override through', async () => {
      const { controller, products } = build();

      await controller.upsertProduct('irembopay', {
        paymentTypeId: 'type-1',
        paymentTypeRateId: 'rate-1',
        productCode: 'PI-abc',
        paymentAccountIdentifier: 'TST-USD',
      });

      expect(products.upsert).toHaveBeenCalledWith(
        'irembopay',
        expect.objectContaining({
          paymentTypeRateId: 'rate-1',
          paymentAccountIdentifier: 'TST-USD',
        }),
      );
    });

    it('removes a mapping scoped to its provider', async () => {
      const { controller, products } = build();

      await controller.removeProduct('irembopay', 'map-1');

      expect(products.remove).toHaveBeenCalledWith('irembopay', 'map-1');
    });
  });

  describe('test panel', () => {
    it('creates a 100 RWF test invoice with no MoMo prompt', async () => {
      const { controller, provider } = build();

      const result = await controller.testInvoice(ADMIN, {});

      expect(provider.charge).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100, isTest: true, pushProvider: undefined }),
      );
      expect(result).toMatchObject({
        invoiceNumber: '880519183280',
        publicKey: 'pk_test_public',
      });
    });

    it('pushes MoMo on the push test, defaulting to MTN', async () => {
      const { controller, provider } = build();

      await controller.testPush(ADMIN, { mobilePhone: '0781234567' });

      expect(provider.charge).toHaveBeenCalledWith(
        expect.objectContaining({
          pushProvider: 'MTN',
          payer: expect.objectContaining({ phone: '0781234567' }),
        }),
      );
    });

    it('honours an explicit Airtel push and a custom amount', async () => {
      const { controller, provider } = build();

      await controller.testPush(ADMIN, { paymentProvider: 'AIRTEL', amount: 250 });

      expect(provider.charge).toHaveBeenCalledWith(
        expect.objectContaining({ pushProvider: 'AIRTEL', amount: 250 }),
      );
    });

    it('marks every test charge as a test so it never pollutes live figures', async () => {
      const { controller, provider } = build();

      await controller.testInvoice(ADMIN, {});
      await controller.testPush(ADMIN, {});

      for (const call of provider.charge.mock.calls) {
        expect(call[0].isTest).toBe(true);
        expect(call[0].transactionId).toMatch(/^TEST-/);
      }
    });

    it('re-checks one invoice against the provider — the lost-callback recovery', async () => {
      const { controller, provider } = build();

      await controller.recheck('880519183280');

      expect(provider.getStatus).toHaveBeenCalledWith('880519183280');
    });

    it('falls back to our transactionId when looking up a local invoice', async () => {
      const { controller, invoices } = build();

      const found = await controller.localInvoice('TEST-1');

      expect(invoices.findByInvoiceNumber).toHaveBeenCalledWith('TEST-1');
      expect(invoices.findByTransactionId).toHaveBeenCalledWith('TEST-1');
      expect(found).toMatchObject({ transactionId: 'TEST-1' });
    });
  });

  describe('checkTransactionStatus', () => {
    const pending = {
      id: 'tx-1',
      requestTransactionId: 'DON-abc12345-1',
      status: PaymentTransactionStatus.PENDING,
      message: null,
    };

    it('404s on an unknown transaction', async () => {
      const { controller } = build([], []);

      await expect(controller.checkTransactionStatus('tx-missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    /** A settled transaction is final — re-querying the provider buys nothing. */
    it('returns a terminal transaction without calling the gateway', async () => {
      const settled = {
        ...pending,
        status: PaymentTransactionStatus.SUCCESSFUL,
        message: 'Paid via MTN_MOMO',
      };
      const { controller, gateway } = build([], [settled]);

      const result = await controller.checkTransactionStatus('tx-1');

      expect(gateway.getStatus).not.toHaveBeenCalled();
      expect(result).toEqual({
        transaction: settled,
        gatewayStatus: PaymentTransactionStatus.SUCCESSFUL,
        message: 'Paid via MTN_MOMO',
      });
    });

    it('re-checks a pending transaction against the gateway by our own id', async () => {
      const { controller, gateway } = build([], [pending, pending]);

      await controller.checkTransactionStatus('tx-1');

      // Our transaction id, not the provider's reference — it is the value every
      // domain record stores and the one the callback carries back.
      expect(gateway.getStatus).toHaveBeenCalledWith('DON-abc12345-1');
    });

    /**
     * `getStatus()` re-applies the invoice state to the ledger on IremboPay, so
     * the row is re-read rather than written here. Writing it in both places is
     * how a transaction ends up with two different ideas of the truth.
     */
    it('returns the row as the invoice service left it, not a locally patched copy', async () => {
      const settled = { ...pending, status: PaymentTransactionStatus.SUCCESSFUL };
      const { controller, txRepo } = build([], [pending, settled]);

      const result = await controller.checkTransactionStatus('tx-1');

      expect(txRepo.findOne).toHaveBeenCalledTimes(2);
      expect(result.transaction).toBe(settled);
      expect(result.gatewayStatus).toBe('SUCCESSFUL');
    });

    /** A vanished row must not blank out the response the caller already has. */
    it('falls back to the pre-check row if the re-read comes back empty', async () => {
      const { controller } = build([], [pending]);

      const result = await controller.checkTransactionStatus('tx-1');

      expect(result.transaction).toBe(pending);
    });
  });
});

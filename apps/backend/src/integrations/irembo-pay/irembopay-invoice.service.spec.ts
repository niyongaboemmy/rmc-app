import { IremboPayInvoiceService, toGatewayStatus } from './irembopay-invoice.service';
import { InvoiceSettlementBus } from './invoice-settlement.bus';
import { IremboPayInvoice } from './entities/irembopay-invoice.entity';
import { IremboInvoice } from './irembo-pay.types';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../../payment-settings/entities/payment-transaction.entity';

const TXN = 'DON-abc12345-1';
const INV = '880519183280';

function localInvoice(overrides: Partial<IremboPayInvoice> = {}): IremboPayInvoice {
  return {
    id: 'row-1',
    transactionId: TXN,
    invoiceNumber: INV,
    paymentAccountIdentifier: 'TST-RWF',
    amount: 5000,
    currency: 'RWF',
    paymentStatus: 'NEW',
    paymentMethod: null,
    paymentReference: null,
    paymentLinkUrl: null,
    expiryAt: null,
    paidAt: null,
    partialPaymentEnabled: false,
    paidAmount: null,
    balance: null,
    paymentTypeKey: 'DONATION',
    referenceId: null,
    isTest: true,
    rawPayload: null,
    ...overrides,
  } as IremboPayInvoice;
}

function remote(overrides: Partial<IremboInvoice> = {}): IremboInvoice {
  return {
    invoiceNumber: INV,
    transactionId: TXN,
    paymentAccountIdentifier: 'TST-RWF',
    paymentItems: [],
    paymentStatus: 'PAID',
    amount: 5000,
    currency: 'RWF',
    ...overrides,
  } as IremboInvoice;
}

/**
 * A fake `DataSource.transaction()` plus the query builder `applyInvoiceState`
 * locks through. `existing` is looked up fresh on every call, which is what
 * lets the race-condition tests below simulate a second concurrent caller
 * seeing whatever the first caller already wrote.
 */
function build(existing: IremboPayInvoice | null = localInvoice()) {
  const savedInvoices: IremboPayInvoice[] = [];
  let current = existing;

  const invoiceRepo = {
    findOne: jest.fn(async () => current),
    create: jest.fn((v: Partial<IremboPayInvoice>) => ({ ...v }) as IremboPayInvoice),
    save: jest.fn(async (v: IremboPayInvoice) => {
      savedInvoices.push(v);
      current = v;
      return v;
    }),
  };

  const savedTx: PaymentTransaction[] = [];
  const txRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((v: Partial<PaymentTransaction>) => ({ ...v }) as PaymentTransaction),
    save: jest.fn(async (v: PaymentTransaction) => {
      savedTx.push(v);
      return v;
    }),
  };

  const settlements = new InvoiceSettlementBus();
  const emitted: unknown[] = [];
  settlements.subscribe((c) => void emitted.push(c));

  const manager = {
    createQueryBuilder: () => ({
      setLock: () => ({
        where: () => ({ getOne: () => invoiceRepo.findOne() }),
      }),
    }),
    save: (_entity: unknown, v: IremboPayInvoice) => invoiceRepo.save(v),
    getRepository: () => txRepo,
  };

  const dataSource = {
    // Sequential in these tests — there is no real concurrency inside one
    // Jest test — but every call still re-reads `current` via the manager
    // above, which is what a real lock's serialisation guarantees.
    transaction: async (cb: (m: typeof manager) => unknown) => cb(manager),
  };

  return {
    service: new IremboPayInvoiceService(
      invoiceRepo as never,
      txRepo as never,
      settlements,
      dataSource as never,
    ),
    invoiceRepo,
    txRepo,
    savedInvoices,
    savedTx,
    emitted,
  };
}

describe('IremboPayInvoiceService', () => {
  describe('applyInvoiceState — idempotency', () => {
    /**
     * IremboPay's portal can re-push notifications, and reconciliation may see
     * the same PAID invoice the webhook just applied. Double-crediting a
     * donation is the worst outcome available here, so PAID is sticky.
     */
    it('acknowledges a repeat PAID without changing anything or notifying again', async () => {
      const { service, invoiceRepo, emitted } = build(localInvoice({ paymentStatus: 'PAID' }));

      const change = await service.applyInvoiceState(remote(), 'webhook');

      expect(change).toMatchObject({
        changed: false,
        status: 'PAID',
        resolvedStatus: 'SUCCESSFUL',
      });
      expect(invoiceRepo.save).not.toHaveBeenCalled();
      expect(emitted).toHaveLength(0);
    });

    it('applies the first PAID and notifies exactly once', async () => {
      const { service, emitted } = build(localInvoice({ paymentStatus: 'NEW' }));

      const change = await service.applyInvoiceState(remote(), 'webhook');

      expect(change).toMatchObject({ previousStatus: 'NEW', status: 'PAID', changed: true });
      expect(emitted).toHaveLength(1);
    });

    it('never emits when nothing changed', async () => {
      const { service, emitted } = build(localInvoice({ paymentStatus: 'NEW' }));

      await service.applyInvoiceState(remote({ paymentStatus: 'NEW' }), 'reconciliation');

      expect(emitted).toHaveLength(0);
    });
  });

  describe('applyInvoiceState — status normalisation', () => {
    it('treats an unpaid invoice past its expiry as EXPIRED, hence FAILED', async () => {
      const { service } = build(localInvoice({ paymentStatus: 'NEW' }));
      const past = new Date(Date.now() - 60_000).toISOString();

      const change = await service.applyInvoiceState(
        remote({ paymentStatus: 'NEW', expiryAt: past }),
        'reconciliation',
      );

      expect(change).toMatchObject({ status: 'EXPIRED', resolvedStatus: 'FAILED' });
    });

    it('does NOT expire an invoice that was paid before its expiry passed', async () => {
      const { service } = build(localInvoice({ paymentStatus: 'NEW' }));
      const past = new Date(Date.now() - 60_000).toISOString();

      const change = await service.applyInvoiceState(
        remote({ paymentStatus: 'PAID', expiryAt: past }),
        'webhook',
      );

      expect(change).toMatchObject({ status: 'PAID', resolvedStatus: 'SUCCESSFUL' });
    });

    it('leaves a not-yet-expired invoice pending', async () => {
      const { service } = build(localInvoice({ paymentStatus: 'NEW' }));
      const future = new Date(Date.now() + 3_600_000).toISOString();

      const change = await service.applyInvoiceState(
        remote({ paymentStatus: 'NEW', expiryAt: future }),
        'reconciliation',
      );

      expect(change).toMatchObject({ status: 'NEW', resolvedStatus: 'PENDING' });
    });

    /** A half-paid invoice must not fulfil an order. */
    it('keeps PARTIALLY_PAID pending and records the balance', async () => {
      const { service, savedInvoices } = build(localInvoice({ paymentStatus: 'NEW' }));

      const change = await service.applyInvoiceState(
        remote({ paymentStatus: 'PARTIALLY_PAID', paidAmount: 2000, balance: 3000 }),
        'webhook',
      );

      expect(change).toMatchObject({ status: 'PARTIALLY_PAID', resolvedStatus: 'PENDING' });
      expect(savedInvoices[0]).toMatchObject({ paidAmount: 2000, balance: 3000 });
    });
  });

  describe('applyInvoiceState — concurrent delivery', () => {
    /**
     * Reproduces, at the unit level, what five concurrent live callbacks did:
     * with locking, each call sees the *result* of the one before it — never
     * the pre-write state a race would let two callers share. Only the first
     * to observe the row transitions and emits; every caller after it takes
     * the sticky-PAID path.
     */
    it('only the first of several deliveries for one invoice changes anything', async () => {
      const { service, emitted } = build(localInvoice({ paymentStatus: 'NEW' }));

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await service.applyInvoiceState(remote(), 'webhook'));
      }

      expect(results[0]).toMatchObject({ changed: true, status: 'PAID' });
      for (const r of results.slice(1)) {
        expect(r).toMatchObject({ changed: false, status: 'PAID' });
      }
      // One transition, one settlement — not one per delivery.
      expect(emitted).toHaveLength(1);
    });

    it('locks by invoice number and by transaction id equally', async () => {
      const { service, emitted } = build(localInvoice({ paymentStatus: 'NEW' }));

      await service.applyInvoiceState(remote(), 'webhook');
      // A second delivery that only carries our transactionId (no invoice
      // number on the payload) must still find the now-PAID row and stop.
      await service.applyInvoiceState(
        remote({ invoiceNumber: undefined as unknown as string }),
        'reconciliation',
      );

      expect(emitted).toHaveLength(1);
    });
  });

  describe('applyInvoiceState — lookup', () => {
    it('returns null for an invoice we have never seen', async () => {
      const { service, emitted } = build(null);

      await expect(service.applyInvoiceState(remote(), 'webhook')).resolves.toBeNull();
      expect(emitted).toHaveLength(0);
    });

    it('falls back to our transactionId when the invoice number is absent', async () => {
      const { service, emitted } = build(localInvoice({ paymentStatus: 'NEW' }));

      const change = await service.applyInvoiceState(
        remote({ invoiceNumber: undefined as unknown as string }),
        'reconciliation',
      );

      // Found and applied via the transactionId path, not silently dropped as
      // an unknown invoice — the lock is taken by whichever reference the
      // payload actually carries.
      expect(change).toMatchObject({ changed: true, status: 'PAID' });
      expect(emitted).toHaveLength(1);
    });
  });

  describe('ledger row', () => {
    it('mirrors a PAID invoice as a successful transaction', async () => {
      const { service, savedTx } = build(localInvoice({ paymentStatus: 'NEW' }));

      await service.applyInvoiceState(remote({ paymentMethod: 'ONLINE_CARD' }), 'webhook');

      expect(savedTx[0]).toMatchObject({
        provider: 'irembopay',
        requestTransactionId: TXN,
        invoiceNumber: INV,
        status: PaymentTransactionStatus.SUCCESSFUL,
        providerPaymentMethod: 'ONLINE_CARD',
      });
      expect(savedTx[0].completedAt).toBeTruthy();
    });

    it('mirrors an expired invoice as a failed transaction', async () => {
      const { service, savedTx } = build(localInvoice({ paymentStatus: 'NEW' }));
      const past = new Date(Date.now() - 60_000).toISOString();

      await service.applyInvoiceState(remote({ paymentStatus: 'NEW', expiryAt: past }), 'webhook');

      expect(savedTx[0].status).toBe(PaymentTransactionStatus.FAILED);
    });

    it('leaves a partially-paid transaction pending with no completion time', async () => {
      const { service, savedTx } = build(localInvoice({ paymentStatus: 'NEW' }));

      await service.applyInvoiceState(
        remote({ paymentStatus: 'PARTIALLY_PAID', paidAmount: 2000, balance: 3000 }),
        'webhook',
      );

      expect(savedTx[0]).toMatchObject({
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
        paidAmount: 2000,
        balance: 3000,
      });
    });

    it('updates the existing ledger row rather than inserting a second one', async () => {
      const { service, txRepo } = build(localInvoice({ paymentStatus: 'NEW' }));
      txRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        requestTransactionId: TXN,
        provider: 'irembopay',
      } as PaymentTransaction);

      await service.applyInvoiceState(remote(), 'webhook');

      expect(txRepo.create).not.toHaveBeenCalled();
      expect(txRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-1' }));
    });
  });

  describe('recordNewInvoice', () => {
    it('reuses the row for a transactionId already invoiced — no duplicate', async () => {
      const { service, invoiceRepo } = build(localInvoice());

      await service.recordNewInvoice(remote({ paymentStatus: 'NEW' }), { isTest: true });

      expect(invoiceRepo.create).not.toHaveBeenCalled();
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('creates a row the first time and carries the domain context onto it', async () => {
      const { service, savedInvoices } = build(null);

      await service.recordNewInvoice(remote({ paymentStatus: 'NEW' }), {
        paymentTypeKey: 'MARRIAGE_FEE',
        referenceId: 'app-1',
        isTest: false,
        payerPhone: '0781234567',
      });

      expect(savedInvoices[0]).toMatchObject({
        transactionId: TXN,
        paymentTypeKey: 'MARRIAGE_FEE',
        referenceId: 'app-1',
        isTest: false,
      });
    });
  });

  describe('toGatewayStatus', () => {
    it.each([
      ['PAID', 'SUCCESSFUL'],
      ['EXPIRED', 'FAILED'],
      ['NEW', 'PENDING'],
      ['PARTIALLY_PAID', 'PENDING'],
    ] as const)('maps %s to %s', (status, expected) => {
      expect(toGatewayStatus(status)).toBe(expected);
    });
  });

  describe('currency and account drift', () => {
    /**
     * A notification in another currency or account than the invoice we made
     * means a misconfigured account. The money has moved, so it still settles;
     * the error log is how finance hears about it.
     */
    it('settles a drifted notification and logs it at error level', async () => {
      const { service, emitted } = build(
        localInvoice({ currency: 'EUR', paymentAccountIdentifier: 'RMC_EUR' }),
      );
      const logError = jest
        .spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error')
        .mockImplementation(() => undefined);

      const change = await service.applyInvoiceState(
        remote({ currency: 'RWF', paymentAccountIdentifier: 'RMC_RWF' }),
        'webhook',
      );

      expect(change?.resolvedStatus).toBe('SUCCESSFUL');
      expect(emitted).toHaveLength(1);
      expect(logError).toHaveBeenCalledWith(
        expect.stringMatching(/currency EUR → RWF, account RMC_EUR → RMC_RWF/),
      );
    });

    it('logs nothing when the notification matches the invoice', async () => {
      const { service } = build();
      const logError = jest
        .spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error')
        .mockImplementation(() => undefined);

      await service.applyInvoiceState(remote(), 'webhook');

      expect(logError).not.toHaveBeenCalled();
    });
  });

  describe('recordNewInvoice — environment', () => {
    it('stores the merchant the invoice was created on', async () => {
      const { service, savedInvoices } = build(null);

      await service.recordNewInvoice(remote({ paymentStatus: 'NEW' }), {
        isTest: true,
        environment: 'production',
      });

      // An admin test-panel invoice on production: test, yet production.
      expect(savedInvoices[0]).toMatchObject({ isTest: true, environment: 'production' });
    });

    it('defaults a legacy caller to sandbox', async () => {
      const { service, savedInvoices } = build(null);

      await service.recordNewInvoice(remote({ paymentStatus: 'NEW' }), { isTest: true });

      expect(savedInvoices[0].environment).toBe('sandbox');
    });
  });
});

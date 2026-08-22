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

function build(existing: IremboPayInvoice | null = localInvoice()) {
  const savedInvoices: IremboPayInvoice[] = [];
  const invoiceRepo = {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn((v: Partial<IremboPayInvoice>) => ({ ...v }) as IremboPayInvoice),
    save: jest.fn(async (v: IremboPayInvoice) => {
      savedInvoices.push(v);
      return v;
    }),
    createQueryBuilder: jest.fn(),
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

  return {
    service: new IremboPayInvoiceService(invoiceRepo as never, txRepo as never, settlements),
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

  describe('applyInvoiceState — lookup', () => {
    it('returns null for an invoice we have never seen', async () => {
      const { service, emitted } = build(null);

      await expect(service.applyInvoiceState(remote(), 'webhook')).resolves.toBeNull();
      expect(emitted).toHaveLength(0);
    });

    it('falls back to our transactionId when the invoice number is absent', async () => {
      const { service, invoiceRepo } = build(localInvoice());

      await service.applyInvoiceState(
        remote({ invoiceNumber: undefined as unknown as string }),
        'reconciliation',
      );

      expect(invoiceRepo.findOne).toHaveBeenCalledWith({ where: { transactionId: TXN } });
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
});

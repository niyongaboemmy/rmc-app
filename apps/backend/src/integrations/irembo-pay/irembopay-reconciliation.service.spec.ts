import { IremboPayReconciliationService } from './irembopay-reconciliation.service';
import { InvoiceSettlementBus } from './invoice-settlement.bus';
import { IremboPayApiError } from './irembo-pay.types';
import { IremboPayInvoice } from './entities/irembopay-invoice.entity';
import { InvoiceStateChange } from './irembopay-invoice.service';

function openInvoice(n: number): IremboPayInvoice {
  return {
    transactionId: `DON-open-${n}`,
    invoiceNumber: `88051918328${n}`,
    paymentStatus: 'NEW',
    amount: 5000,
    currency: 'RWF',
  } as IremboPayInvoice;
}

function build(options: { open?: IremboPayInvoice[]; getInvoice?: jest.Mock } = {}) {
  const open = options.open ?? [openInvoice(1)];

  const irembo = {
    getInvoice:
      options.getInvoice ??
      jest.fn(async (ref: string) => ({
        invoiceNumber: ref,
        transactionId: 'DON-open-1',
        paymentStatus: 'PAID',
        amount: 5000,
        currency: 'RWF',
        paymentMethod: 'BK',
      })),
  };

  const config = {
    isConfigured: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue({ environment: 'production' }),
  };

  const settlements = new InvoiceSettlementBus();
  const applied: InvoiceStateChange[] = [];

  const invoices = {
    findOpenForReconciliation: jest.fn().mockResolvedValue(open),
    applyInvoiceState: jest.fn(async (remote: { paymentStatus: string }) => {
      const change = {
        invoice: openInvoice(1),
        previousStatus: 'NEW',
        status: remote.paymentStatus,
        changed: remote.paymentStatus !== 'NEW',
        resolvedStatus: remote.paymentStatus === 'PAID' ? 'SUCCESSFUL' : 'PENDING',
      } as InvoiceStateChange;
      applied.push(change);
      if (change.changed) await settlements.emit(change);
      return change;
    }),
  };

  return {
    service: new IremboPayReconciliationService(
      irembo as never,
      config as never,
      invoices as never,
    ),
    irembo,
    config,
    invoices,
    settlements,
    applied,
  };
}

describe('IremboPayReconciliationService', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['performance'] }));
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /** The service spaces its calls with a timer; drive it to completion. */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    const result = promise.then(
      (v) => ({ ok: true as const, v }),
      (e) => ({ ok: false as const, e }),
    );
    for (let i = 0; i < 400; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(500);
    }
    const settled = await result;
    if (settled.ok) return settled.v;
    throw settled.e;
  }

  it('recovers a payment whose callback was dropped, within one cycle', async () => {
    const { service, invoices, settlements } = build();
    const notified: InvoiceStateChange[] = [];
    settlements.subscribe((c) => void notified.push(c));

    const summary = await settle(service.reconcile());

    expect(summary).toEqual({ checked: 1, updated: 1, failed: 0 });
    expect(invoices.applyInvoiceState).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'PAID' }),
      'reconciliation',
    );
    // The domain fan-out fires exactly as it would from a webhook.
    expect(notified).toHaveLength(1);
    expect(notified[0].resolvedStatus).toBe('SUCCESSFUL');
  });

  it('only asks for invoices that are still open — paid ones cost no API call', async () => {
    const { service, invoices, irembo } = build({ open: [] });

    const summary = await settle(service.reconcile());

    expect(invoices.findOpenForReconciliation).toHaveBeenCalled();
    expect(irembo.getInvoice).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 0, updated: 0, failed: 0 });
  });

  it('counts an unchanged invoice as checked but not updated', async () => {
    const getInvoice = jest.fn().mockResolvedValue({
      invoiceNumber: '880519183281',
      transactionId: 'DON-open-1',
      paymentStatus: 'NEW',
      amount: 5000,
      currency: 'RWF',
    });
    const { service } = build({ getInvoice });

    const summary = await settle(service.reconcile());
    expect(summary).toEqual({ checked: 1, updated: 0, failed: 0 });
  });

  it('keeps sweeping when one invoice fails', async () => {
    const getInvoice = jest
      .fn()
      .mockRejectedValueOnce(new IremboPayApiError('gone', 404, 'INVOICE_NOT_FOUND'))
      .mockResolvedValue({
        invoiceNumber: '880519183282',
        transactionId: 'DON-open-2',
        paymentStatus: 'PAID',
        amount: 5000,
        currency: 'RWF',
      });
    const { service } = build({ open: [openInvoice(1), openInvoice(2)], getInvoice });

    const summary = await settle(service.reconcile());

    expect(summary).toEqual({ checked: 2, updated: 1, failed: 1 });
  });

  it('stops the run early when rate limited rather than hammering the provider', async () => {
    const getInvoice = jest
      .fn()
      .mockRejectedValue(new IremboPayApiError('slow down', 429, 'RATE_LIMITED'));
    const { service } = build({
      open: [openInvoice(1), openInvoice(2), openInvoice(3)],
      getInvoice,
    });

    const summary = await settle(service.reconcile());

    expect(getInvoice).toHaveBeenCalledTimes(1);
    expect(summary.checked).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('does nothing at all when IremboPay is not configured', async () => {
    const { service, config, invoices } = build();
    config.isConfigured.mockResolvedValue(false);

    const summary = await settle(service.reconcile());

    expect(invoices.findOpenForReconciliation).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 0, updated: 0, failed: 0 });
  });

  it('refuses to start a second sweep while one is still running', async () => {
    const { service, invoices } = build({ open: [openInvoice(1), openInvoice(2)] });

    const first = service.reconcile();
    // Let the first sweep get past its config check and claim the lock.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    const second = await service.reconcile();

    expect(second).toEqual({ checked: 0, updated: 0, failed: 0 });
    await settle(first);
    expect(invoices.findOpenForReconciliation).toHaveBeenCalledTimes(1);
  });

  /**
   * A sandbox invoice does not exist on the production host. Polling it after
   * the cutover would 404 on every run until it aged out.
   */
  it('only polls invoices of the merchant it is configured for', async () => {
    const { service, config, invoices } = build();

    await settle(service.reconcile());
    expect(invoices.findOpenForReconciliation).toHaveBeenLastCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.any(Number),
      'production',
    );

    config.get.mockResolvedValue({ environment: 'sandbox' });
    await settle(service.reconcile());
    expect(invoices.findOpenForReconciliation).toHaveBeenLastCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.any(Number),
      'sandbox',
    );
  });
});

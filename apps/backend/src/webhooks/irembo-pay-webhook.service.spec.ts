import { IremboPayWebhookService } from './irembo-pay-webhook.service';
import { buildIremboSignature } from '../integrations/irembo-pay/irembo-pay-signature.util';
import { IremboPayConfig } from '../integrations/irembo-pay/irembo-pay.config.service';
import { IremboPayInvoice } from '../integrations/irembo-pay/entities/irembopay-invoice.entity';
import { InvoiceSettlementBus } from '../integrations/irembo-pay/invoice-settlement.bus';
import { InvoiceStateChange } from '../integrations/irembo-pay/irembopay-invoice.service';

const SECRET = 'sk_test_webhook_key';

const CONFIG: IremboPayConfig = {
  secretKey: SECRET,
  publicKey: 'pk_test',
  paymentAccountIdentifier: 'TST-RWF',
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
  simulatorMode: 'off' as const,
  simulatorDelayMs: 5000,
  testMsisdn: '0781234567',
  isTestMode: true,
};

function notification(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    success: true,
    message: 'Payment received',
    data: {
      invoiceNumber: '880519183280',
      transactionId: 'DON-abc12345-1',
      paymentStatus: 'PAID',
      amount: 5000,
      currency: 'RWF',
      paymentMethod: 'MOMO_PUSH',
      paidAt: '2026-08-21T10:00:00.000Z',
      ...overrides,
    },
  });
}

function invoiceRow(overrides: Partial<IremboPayInvoice> = {}): IremboPayInvoice {
  return {
    transactionId: 'DON-abc12345-1',
    invoiceNumber: '880519183280',
    paymentStatus: 'PAID',
    amount: 5000,
    currency: 'RWF',
    paymentMethod: 'MOMO_PUSH',
    balance: 0,
    ...overrides,
  } as IremboPayInvoice;
}

function build(applyResult: unknown = undefined) {
  const config = { get: jest.fn().mockResolvedValue(CONFIG) };

  let current: unknown =
    applyResult === undefined
      ? {
          invoice: invoiceRow(),
          previousStatus: 'NEW',
          status: 'PAID',
          changed: true,
          resolvedStatus: 'SUCCESSFUL',
        }
      : applyResult;

  const resolveChange = async () => current as InvoiceStateChange | null;

  const invoices = {
    applyInvoiceState: jest.fn(),
    /** Test hook: what the next apply resolves to. */
    setNext: (v: unknown) => {
      current = v;
    },
  };
  const paymentEvents = { emit: jest.fn() };
  const marriage = { handleCallback: jest.fn().mockResolvedValue(undefined) };
  const donation = { handleCallback: jest.fn().mockResolvedValue(undefined) };
  const goodConduct = { handleCallback: jest.fn().mockResolvedValue(undefined) };

  // The real bus is used so the test exercises the subscribe → dispatch path
  // that the reconciliation sweep also relies on.
  const settlements = new InvoiceSettlementBus();

  const service = new IremboPayWebhookService(
    config as never,
    invoices as never,
    paymentEvents as never,
    marriage as never,
    donation as never,
    goodConduct as never,
    settlements,
  );

  // `applyInvoiceState` is mocked here, so the emit the real service performs
  // is stood in for by the bus emitting whatever the mock resolved to.
  invoices.applyInvoiceState.mockImplementation(async () => {
    const change = await resolveChange();
    if (change?.changed) await settlements.emit(change);
    return change;
  });

  return { service, invoices, paymentEvents, marriage, donation, goodConduct, settlements };
}

describe('IremboPayWebhookService', () => {
  it('applies a correctly signed PAID notification and notifies every domain', async () => {
    const body = notification();
    const { service, paymentEvents, donation, marriage, goodConduct } = build();

    const result = await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('applied');
    expect(result.status).toBe('PAID');

    expect(paymentEvents.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payment.confirmed', status: 'SUCCESSFUL' }),
    );
    // The transactionId prefix is preserved so the shared domain matching works.
    for (const handler of [donation, marriage, goodConduct]) {
      expect(handler.handleCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          requesttransactionid: 'DON-abc12345-1',
          responsecode: '01',
          status: 'Successfull',
        }),
      );
    }
  });

  it('changes nothing on an invalid signature', async () => {
    const body = notification();
    const { service, invoices, donation } = build();

    const result = await service.handle(Buffer.from(body), buildIremboSignature('wrong-key', body));

    expect(result.outcome).toBe('invalid_signature');
    expect(invoices.applyInvoiceState).not.toHaveBeenCalled();
    expect(donation.handleCallback).not.toHaveBeenCalled();
  });

  it('changes nothing when the signature header is missing entirely', async () => {
    const { service, invoices } = build();

    const result = await service.handle(Buffer.from(notification()), undefined);

    expect(result.outcome).toBe('invalid_signature');
    expect(invoices.applyInvoiceState).not.toHaveBeenCalled();
  });

  it('applies the same notification twice but updates the domain only once', async () => {
    const body = notification();
    const signature = buildIremboSignature(SECRET, body);
    const { service, invoices, donation } = build();

    const first = await service.handle(Buffer.from(body), signature);

    // The second delivery finds the invoice already PAID.
    invoices.setNext({
      invoice: invoiceRow(),
      previousStatus: 'PAID',
      status: 'PAID',
      changed: false,
      resolvedStatus: 'SUCCESSFUL',
    });
    const second = await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(first.outcome).toBe('applied');
    expect(second.outcome).toBe('duplicate');
    expect(donation.handleCallback).toHaveBeenCalledTimes(1);
  });

  it('acknowledges an unknown invoice without touching any domain record', async () => {
    const body = notification({ invoiceNumber: '999999999999' });
    const { service, donation } = build(null);

    const result = await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('unknown_invoice');
    expect(donation.handleCallback).not.toHaveBeenCalled();
  });

  it('records a PARTIALLY_PAID invoice but leaves the domain record pending', async () => {
    const body = notification({ paymentStatus: 'PARTIALLY_PAID', paidAmount: 2000, balance: 3000 });
    const { service, paymentEvents, donation } = build({
      invoice: invoiceRow({ paymentStatus: 'PARTIALLY_PAID', paidAmount: 2000, balance: 3000 }),
      previousStatus: 'NEW',
      status: 'PARTIALLY_PAID',
      changed: true,
      resolvedStatus: 'PENDING',
    });

    const result = await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('applied');
    expect(result.status).toBe('PARTIALLY_PAID');
    expect(paymentEvents.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payment.pending' }),
    );
    expect(donation.handleCallback).not.toHaveBeenCalled();
  });

  it('reports an expired invoice as a failure to the domain services', async () => {
    const body = notification({ paymentStatus: 'EXPIRED' });
    const { service, donation } = build({
      invoice: invoiceRow({ paymentStatus: 'EXPIRED' }),
      previousStatus: 'NEW',
      status: 'EXPIRED',
      changed: true,
      resolvedStatus: 'FAILED',
    });

    await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(donation.handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Failed', responsecode: '1008' }),
    );
  });

  it('classifies an empty body rather than throwing', async () => {
    const { service } = build();
    await expect(service.handle(undefined, 't=1,s=x')).resolves.toEqual({ outcome: 'malformed' });
  });

  it('classifies a signed but non-JSON body as malformed', async () => {
    const body = 'not json at all';
    const { service, invoices } = build();

    const result = await service.handle(body, buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('malformed');
    expect(invoices.applyInvoiceState).not.toHaveBeenCalled();
  });

  it('classifies a signed payload with no invoice reference as malformed', async () => {
    const body = JSON.stringify({ success: true, data: { amount: 5000 } });
    const { service, invoices } = build();

    const result = await service.handle(body, buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('malformed');
    expect(invoices.applyInvoiceState).not.toHaveBeenCalled();
  });

  it('keeps going when one domain handler throws', async () => {
    const body = notification();
    const { service, marriage, donation, goodConduct } = build();
    marriage.handleCallback.mockRejectedValue(new Error('marriage exploded'));

    const result = await service.handle(Buffer.from(body), buildIremboSignature(SECRET, body));

    expect(result.outcome).toBe('applied');
    expect(donation.handleCallback).toHaveBeenCalled();
    expect(goodConduct.handleCallback).toHaveBeenCalled();
  });

  it('rejects a replayed notification outside the tolerance window', async () => {
    const body = notification();
    const stale = buildIremboSignature(SECRET, body, Date.now() - 10 * 60 * 1000);
    const { service, invoices } = build();

    const result = await service.handle(Buffer.from(body), stale);

    expect(result.outcome).toBe('invalid_signature');
    expect(invoices.applyInvoiceState).not.toHaveBeenCalled();
  });
});

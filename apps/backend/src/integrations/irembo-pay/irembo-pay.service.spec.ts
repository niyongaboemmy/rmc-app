import { IremboPayClient } from './irembo-pay.client';
import { IremboPayService } from './irembo-pay.service';
import { IremboPayConfigService, IremboPayConfig } from './irembo-pay.config.service';
import { IremboPayApiError, normalizeMsisdn, isValidMsisdn } from './irembo-pay.types';

const SECRET = 'sk_test_SUPER_SECRET_KEY_9f2a';

const CONFIG: IremboPayConfig = {
  secretKey: SECRET,
  publicKey: 'pk_test_public',
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

function envelope(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function build(configOverrides: Partial<IremboPayConfig> = {}) {
  const config = {
    get: jest.fn().mockResolvedValue({ ...CONFIG, ...configOverrides }),
    isConfigured: jest.fn().mockResolvedValue(true),
    accountForCurrency: jest.fn().mockResolvedValue('TST-RWF'),
    invalidate: jest.fn(),
  } as unknown as IremboPayConfigService;

  const saved: Array<Record<string, unknown>> = [];
  const eventRepo = {
    create: (v: Record<string, unknown>) => v,
    save: jest.fn(async (v: Record<string, unknown>) => {
      saved.push(v);
      return v;
    }),
  } as never;

  const client = new IremboPayClient(config, eventRepo);
  // These cases pin down the wire protocol, so the sandbox is held off: every
  // call must reach the mocked HTTP layer.
  const sandbox = { isActive: async () => false } as never;
  const service = new IremboPayService(client, config, sandbox);
  return { client, service, config, events: saved };
}

describe('IremboPay client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** Advances fake timers as the retry backoff schedules them. */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    // Flush several microtasks between timer advances rather than one: the
    // request path awaits a few promises before it ever arms a backoff timer,
    // so a single flush per advance can step the clock past a timer that has
    // not been scheduled yet and stall the retry loop.
    const tick = async () => {
      for (let i = 0; i < 40; i++) {
        for (let j = 0; j < 8; j++) await Promise.resolve();
        jest.advanceTimersByTime(5_000);
      }
    };
    const result = promise.then(
      (v) => ({ ok: true as const, v }),
      (e) => ({ ok: false as const, e }),
    );
    await tick();
    const settled = await result;
    if (settled.ok) return settled.v;
    throw settled.e;
  }

  it('creates an invoice and unwraps the envelope', async () => {
    const { service } = build();
    fetchMock.mockResolvedValue(
      envelope({
        success: true,
        message: 'Invoice created',
        data: {
          invoiceNumber: '880519183280',
          transactionId: 'DON-abc-1',
          paymentStatus: 'NEW',
          amount: 100,
          currency: 'RWF',
          paymentLinkUrl: 'https://pay.irembopay.com/880519183280',
        },
      }),
    );

    const invoice = await settle(
      service.createInvoice({
        transactionId: 'DON-abc-1',
        paymentAccountIdentifier: 'TST-RWF',
        paymentItems: [{ code: 'PI-3e5fe23f2d', quantity: 1, unitAmount: 100 }],
        customer: { name: 'Test', phoneNumber: '250781234567' },
      }),
    );

    expect(invoice.invoiceNumber).toBe('880519183280');
    expect(invoice.paymentLinkUrl).toContain('880519183280');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sandbox.irembopay.com/payments/invoices');
    expect(init.method).toBe('POST');
    expect(init.headers['irembopay-secretKey']).toBe(SECRET);
    expect(init.headers['X-API-Version']).toBe('3');
    // Customer phone is normalised through the single helper.
    expect(JSON.parse(init.body).customer.phoneNumber).toBe('0781234567');
    // We never send a total — IremboPay computes it from the items.
    expect(JSON.parse(init.body).amount).toBeUndefined();
  });

  it('maps 401 AUTHENTICATION_FAILED to an actionable message and does not retry', async () => {
    const { service } = build();
    fetchMock.mockResolvedValue(
      envelope(
        {
          success: false,
          errors: [{ code: 'AUTHENTICATION_FAILED', detail: 'Invalid IremboPay secret key' }],
        },
        401,
      ),
    );

    await expect(settle(service.getInvoice('880519183280'))).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
      httpStatus: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never retries a 4xx — DUPLICATE_TRANSACTION_ID is attempted exactly once', async () => {
    const { service } = build();
    fetchMock.mockResolvedValue(
      envelope(
        { success: false, errors: [{ code: 'DUPLICATE_TRANSACTION_ID', detail: 'exists' }] },
        400,
      ),
    );

    await expect(
      settle(
        service.createInvoice({
          transactionId: 'DON-dup-1',
          paymentAccountIdentifier: 'TST-RWF',
          paymentItems: [{ code: 'PI-1', quantity: 1, unitAmount: 100 }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_TRANSACTION_ID' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 with backoff and succeeds on the second attempt', async () => {
    const { service, events } = build();
    fetchMock
      .mockResolvedValueOnce(envelope({ success: false, errors: [{ code: 'RATE_LIMITED' }] }, 429))
      .mockResolvedValueOnce(
        envelope({ success: true, data: { invoiceNumber: 'INV-2', paymentStatus: 'NEW' } }),
      );

    const invoice = await settle(service.getInvoice('INV-2'));

    expect(invoice.invoiceNumber).toBe('INV-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events.map((e) => e.outcome)).toEqual(['error', 'success']);
    expect(events[1].attempt).toBe(2);
  });

  it('gives up after three attempts on a persistent 5xx', async () => {
    const { service } = build();
    fetchMock.mockResolvedValue(envelope({ success: false, errors: [{ code: 'SERVER' }] }, 503));

    await expect(settle(service.getInvoice('INV-3'))).rejects.toBeInstanceOf(IremboPayApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports a timeout as a timeout outcome', async () => {
    const { service, events } = build();
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abortError);

    await expect(settle(service.getInvoice('INV-4'))).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(events.every((e) => e.outcome === 'timeout')).toBe(true);
  });

  it('refuses to call out at all when no secret key is configured', async () => {
    const { service } = build({ secretKey: '' });

    await expect(settle(service.getInvoice('INV-5'))).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the secret key out of every log line, event row and thrown error', async () => {
    const captured: string[] = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest
        .spyOn(
          Object.getPrototypeOf(
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            new (require('@nestjs/common').Logger)('t'),
          ),
          level,
        )
        .mockImplementation((...args: unknown[]) => {
          captured.push(args.map(String).join(' '));
        });
    }

    const { service, events } = build();
    fetchMock.mockResolvedValue(
      envelope({ success: false, errors: [{ code: 'BAD_DATA', detail: 'nope' }] }, 400),
    );

    const error: IremboPayApiError = await settle(
      service.createInvoice({
        transactionId: 'DON-leak-1',
        paymentAccountIdentifier: 'TST-RWF',
        paymentItems: [{ code: 'PI-1', quantity: 1, unitAmount: 100 }],
      }),
    ).then(
      () => {
        throw new Error('expected the call to fail');
      },
      (e: IremboPayApiError) => e,
    );

    const surface = [
      ...captured,
      JSON.stringify(events),
      error.message,
      String(error.detail),
      String(error.url),
      error.stack ?? '',
    ].join('\n');

    expect(surface).not.toContain(SECRET);
    expect(surface.length).toBeGreaterThan(0);
  });

  it('sends the per-call API version override instead of the configured one', async () => {
    const { client } = build();
    fetchMock.mockResolvedValue(envelope({ success: true, data: {} }));

    await settle(
      client.request('get_invoice', { method: 'GET', path: '/payments/plans', apiVersion: '2' }),
    );

    expect(fetchMock.mock.calls[0][1].headers['X-API-Version']).toBe('2');
  });

  it('surfaces a non-JSON body as BAD_RESPONSE rather than crashing', async () => {
    const { service } = build();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html>502 Bad Gateway</html>'),
    } as Response);

    await expect(settle(service.getInvoice('INV-6'))).rejects.toMatchObject({
      code: 'BAD_RESPONSE',
    });
  });
});

describe('IremboPay expiry formatting', () => {
  it('emits RFC 3339 with an explicit offset, not a bare Z', () => {
    const { service } = build();
    const formatted = service.formatExpiry(new Date('2026-08-22T14:24:51.000Z'));

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    expect(new Date(formatted).getTime()).toBe(new Date('2026-08-22T14:24:51.000Z').getTime());
  });
});

/**
 * The docs contradict themselves on MoMo phone format — the request table shows
 * `07########`, `BAD_PHONE_NUMBER` describes 12 digits. We normalise to the
 * local form the field description mandates; these tests pin that decision so
 * flipping it is a one-line change with a failing test to prove it happened.
 */
describe('normalizeMsisdn', () => {
  it.each([
    ['0781234567', '0781234567'],
    ['250781234567', '0781234567'],
    ['+250 781 234 567', '0781234567'],
    ['781234567', '0781234567'],
    ['078-123-4567', '0781234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizeMsisdn(input)).toBe(expected);
  });

  it('accepts the sandbox success and failure test numbers', () => {
    expect(isValidMsisdn('0781234567')).toBe(true);
    expect(isValidMsisdn('0780123456')).toBe(true);
  });

  it('rejects a landline and a too-short number', () => {
    expect(isValidMsisdn('0252345678')).toBe(false);
    expect(isValidMsisdn('07812345')).toBe(false);
  });
});

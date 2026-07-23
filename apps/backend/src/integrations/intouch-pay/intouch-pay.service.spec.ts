import * as http from 'http';
import type { AddressInfo } from 'net';
import { IntouchPayService } from './intouch-pay.service';

/**
 * Resilience tests against a REAL local server that accepts the connection but
 * never responds — the authentic "slow/unresponsive provider" condition. Proves
 * the request is aborted on timeout (no indefinite hang) and degrades to PENDING
 * rather than a hard failure, and that read-only status checks retry.
 */
describe('IntouchPayService — provider timeout resilience', () => {
  let server: http.Server;
  let baseUrl: string;
  const events = { record: jest.fn() };
  const simulator = { isActive: () => false, state: { mode: 'off', delayMs: 0, active: false } };

  beforeAll((done) => {
    // Accept the socket, then hang forever (never write a response).
    server = http.createServer(() => {
      /* intentionally no response */
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}/`;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => done());
  });

  beforeEach(() => {
    events.record.mockClear();
    process.env.PAYMENT_TIMEOUT_MS = '600';
    process.env.PAYMENT_RETRY_BACKOFF_MS = '50';
  });

  it('requestPayment aborts and returns PENDING/TIMEOUT instead of hanging', async () => {
    process.env.PAYMENT_MAX_RETRIES = '0';
    const service = new IntouchPayService(events as never, simulator as never);

    const start = Date.now();
    const res = await service.requestPayment({
      username: 'u',
      partnerPassword: 'p',
      accountNo: 'a',
      amount: 2000,
      mobilePhone: '0781234567',
      transactionId: 'TXN-TIMEOUT-1',
      gatewayUrl: baseUrl,
    });
    const elapsed = Date.now() - start;

    expect(res.status).toBe('PENDING');
    expect(res.responseCode).toBe('TIMEOUT');
    expect(elapsed).toBeLessThan(3000); // aborted quickly, did not hang on the socket
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'request_payment', outcome: 'timeout' }),
    );
    // A charge must NEVER be auto-retried (double-charge risk): exactly one attempt.
    expect(events.record).toHaveBeenCalledTimes(1);
  });

  it('getTransactionStatus retries then degrades to PENDING', async () => {
    process.env.PAYMENT_MAX_RETRIES = '2';
    const service = new IntouchPayService(events as never, simulator as never);

    const res = await service.getTransactionStatus({
      username: 'u',
      partnerPassword: 'p',
      accountNo: 'a',
      requestTransactionId: 'TXN-STATUS-1',
      transactionId: 'X',
      gatewayBaseUrl: `${baseUrl}requestpayment/`,
    });

    expect(res.status).toBe('PENDING');
    const statusTimeouts = events.record.mock.calls.filter(
      (c) => c[0].operation === 'get_status' && c[0].outcome === 'timeout',
    );
    expect(statusTimeouts.length).toBe(3); // 1 initial + 2 retries
  }, 15000);
});

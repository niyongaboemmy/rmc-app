import { PaymentProviderEventsService } from './payment-provider-events.service';

/**
 * The provider-neutral telemetry recorder, relocated out of the IntouchPay
 * folder. Two properties matter and neither is obvious from the type:
 * the `provider` column is no longer hardcoded, and a write failure must never
 * reach the payment flow that triggered it.
 */
describe('PaymentProviderEventsService', () => {
  let repo: { insert: jest.Mock; createQueryBuilder: jest.Mock };
  let service: PaymentProviderEventsService;

  const rows = (r: unknown[]) => ({
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(r),
  });

  beforeEach(() => {
    repo = {
      insert: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(rows([])),
    };
    service = new PaymentProviderEventsService(repo as never);
  });

  describe('record', () => {
    /** It used to write a hardcoded 'intouchpay'. That gateway no longer exists. */
    it('defaults the provider to the surviving gateway', () => {
      service.record({ operation: 'create_invoice', outcome: 'success', latencyMs: 120 });

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'irembopay', operation: 'create_invoice' }),
      );
    });

    it('lets the caller name the provider', () => {
      service.record({
        provider: 'some-other-gateway',
        operation: 'get_invoice',
        outcome: 'timeout',
        latencyMs: 30_000,
      });

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'some-other-gateway' }),
      );
    });

    it('applies the documented defaults for the optional fields', () => {
      service.record({ operation: 'initiate_push', outcome: 'error', latencyMs: 10 });

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          slow: false,
          attempt: 1,
          simulated: false,
          responseCode: null,
          requestTransactionId: null,
          detail: null,
        }),
      );
    });

    /** `detail` is a text column fed by provider error bodies of unknown size. */
    it('truncates an oversized detail rather than failing the insert', () => {
      service.record({
        operation: 'get_invoice',
        outcome: 'error',
        latencyMs: 5,
        detail: 'x'.repeat(5000),
      });

      expect(repo.insert.mock.calls[0][0].detail).toHaveLength(2000);
    });

    /**
     * The whole point of the service: monitoring is fire-and-forget, so a
     * failing insert must be swallowed. If this rejection escaped it would
     * become an unhandled rejection inside a live payment.
     */
    it('swallows a write failure instead of breaking the payment flow', async () => {
      repo.insert.mockRejectedValue(new Error('db is down'));

      expect(() =>
        service.record({ operation: 'create_invoice', outcome: 'success', latencyMs: 1 }),
      ).not.toThrow();

      await new Promise((r) => setImmediate(r));
    });

    it('returns synchronously without awaiting the write', () => {
      let settled = false;
      repo.insert.mockReturnValue(
        new Promise((r) =>
          setTimeout(() => {
            settled = true;
            r(undefined);
          }, 50),
        ),
      );

      service.record({ operation: 'create_invoice', outcome: 'success', latencyMs: 1 });

      expect(settled).toBe(false);
    });
  });

  describe('summary', () => {
    it('reports zeroes over an empty window without dividing by zero', async () => {
      const result = await service.summary(60);

      expect(result).toEqual({
        windowMinutes: 60,
        total: 0,
        byOutcome: {},
        timeoutRate: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        slowCount: 0,
      });
    });

    it('aggregates outcomes, latency and the timeout rate', async () => {
      repo.createQueryBuilder.mockReturnValue(
        rows([
          { outcome: 'success', latencyMs: 100, slow: false },
          { outcome: 'success', latencyMs: 200, slow: false },
          { outcome: 'timeout', latencyMs: 30_000, slow: true },
          { outcome: 'error', latencyMs: 300, slow: false },
        ]),
      );

      const result = await service.summary(120);

      expect(result.windowMinutes).toBe(120);
      expect(result.total).toBe(4);
      expect(result.byOutcome).toEqual({ success: 2, timeout: 1, error: 1 });
      expect(result.timeoutRate).toBe(0.25);
      expect(result.avgLatencyMs).toBe(7650);
      expect(result.slowCount).toBe(1);
    });

    it('takes p95 from the sorted latencies, not insertion order', async () => {
      repo.createQueryBuilder.mockReturnValue(
        rows([
          { outcome: 'success', latencyMs: 900, slow: false },
          { outcome: 'success', latencyMs: 100, slow: false },
          { outcome: 'success', latencyMs: 500, slow: false },
        ]),
      );

      const result = await service.summary();

      expect(result.p95LatencyMs).toBe(900);
    });
  });
});

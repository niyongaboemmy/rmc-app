import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentProviderEvent,
  PaymentOperation,
  PaymentEventOutcome,
} from './entities/payment-provider-event.entity';

export interface RecordEventInput {
  /** Which gateway produced the attempt. Defaults to the only live one. */
  provider?: string;
  operation: PaymentOperation;
  outcome: PaymentEventOutcome;
  latencyMs: number;
  slow?: boolean;
  attempt?: number;
  responseCode?: string | null;
  requestTransactionId?: string | null;
  detail?: string | null;
  simulated?: boolean;
}

/**
 * Records one row per payment-provider request attempt for monitoring.
 *
 * Provider-neutral. Named `PaymentProviderEventsService` and not
 * `PaymentEventsService` because `payment-settings/payment-events.service.ts`
 * already owns that name for the admin SSE bus — two same-named injectables in
 * one container is how the wrong one gets injected.
 *
 * Fire-and-forget by design: a logging failure must NEVER break a payment. All
 * writes are best-effort and swallow their own errors.
 */
@Injectable()
export class PaymentProviderEventsService {
  private readonly logger = new Logger(PaymentProviderEventsService.name);

  constructor(
    @InjectRepository(PaymentProviderEvent)
    private readonly repo: Repository<PaymentProviderEvent>,
  ) {}

  record(input: RecordEventInput): void {
    // Do not await — the caller (a payment flow) must not block on monitoring.
    void this.repo
      .insert({
        provider: input.provider ?? 'irembopay',
        operation: input.operation,
        outcome: input.outcome,
        latencyMs: input.latencyMs,
        slow: input.slow ?? false,
        attempt: input.attempt ?? 1,
        responseCode: input.responseCode ?? null,
        requestTransactionId: input.requestTransactionId ?? null,
        detail: input.detail ? input.detail.slice(0, 2000) : null,
        simulated: input.simulated ?? false,
      })
      .catch((err) => this.logger.warn(`Failed to record payment event: ${err}`));
  }

  /** Simple monitoring summary over a recent window (used by the admin health endpoint). */
  async summary(sinceMinutes = 60): Promise<{
    windowMinutes: number;
    total: number;
    byOutcome: Record<string, number>;
    timeoutRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    slowCount: number;
  }> {
    const since = new Date(Date.now() - sinceMinutes * 60_000);
    const rows = await this.repo
      .createQueryBuilder('e')
      .where('e.createdAt >= :since', { since })
      .getMany();

    const byOutcome: Record<string, number> = {};
    let latencySum = 0;
    let slowCount = 0;
    const latencies: number[] = [];
    for (const r of rows) {
      byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
      latencySum += r.latencyMs;
      latencies.push(r.latencyMs);
      if (r.slow) slowCount++;
    }
    latencies.sort((a, b) => a - b);
    const total = rows.length;
    const timeouts = byOutcome['timeout'] ?? 0;
    const p95 = latencies.length
      ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))]
      : 0;

    return {
      windowMinutes: sinceMinutes,
      total,
      byOutcome,
      timeoutRate: total ? Number((timeouts / total).toFixed(3)) : 0,
      avgLatencyMs: total ? Math.round(latencySum / total) : 0,
      p95LatencyMs: p95,
      slowCount,
    };
  }
}

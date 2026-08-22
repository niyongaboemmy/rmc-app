import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, And } from 'typeorm';
import { GoodConductTransaction } from './entities/good-conduct-transaction.entity';
import { GoodConductService } from './good-conduct.service';

/**
 * Periodically settles Good Conduct MoMo payments left in PENDING — the
 * "queue for later confirmation" safety net for when IntouchPay was slow or
 * unavailable at charge time (so the request degraded to PENDING instead of
 * failing). Mirrors DonationReconciliationService.
 *
 * Runs every 3 minutes over pending momo transactions that are:
 *   - older than 3 minutes (give the live polling window time to finish), and
 *   - younger than 24 hours (ignore ancient stuck records).
 */
@Injectable()
export class GoodConductReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoodConductReconciliationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly RUN_INTERVAL_MS = 3 * 60 * 1000;
  private readonly MIN_AGE_MS = 3 * 60 * 1000;
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(GoodConductTransaction)
    private readonly txRepo: Repository<GoodConductTransaction>,
    private readonly service: GoodConductService,
  ) {}

  onModuleInit(): void {
    // Held so shutdown can cancel it — a process that closes within 45s would
    // otherwise die querying a connection that is already gone.
    this.startupTimer = setTimeout(() => void this.tick(), 45_000);
    this.timer = setInterval(() => void this.tick(), this.RUN_INTERVAL_MS);
  }

  /** One scheduled pass: settle stuck MoMo payments, then send any due payment reminders. */
  private async tick(): Promise<void> {
    await this.reconcile();
    try {
      await this.service.sendDuePaymentReminders();
    } catch (err) {
      this.logger.warn(`[GC-Reconciliation] payment reminder pass failed: ${err}`);
    }
  }

  onModuleDestroy(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer);
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(): Promise<void> {
    const now = Date.now();
    const olderThan = new Date(now - this.MIN_AGE_MS);
    const newerThan = new Date(now - this.MAX_AGE_MS);

    const pending = await this.txRepo.find({
      where: {
        method: 'momo',
        status: 'pending',
        initiatedAt: And(LessThan(olderThan), MoreThan(newerThan)),
      },
      order: { initiatedAt: 'DESC' },
      take: 50,
    });
    if (!pending.length) return;

    this.logger.log(`[GC-Reconciliation] Checking ${pending.length} pending MoMo payment(s)`);

    let resolved = 0;
    for (const tx of pending) {
      try {
        const status = await this.service.reconcilePendingMomo(tx.requestId);
        if (status === 'paid' || status === 'failed') {
          resolved++;
          this.logger.log(`[GC-Reconciliation] Request ${tx.requestId} → ${status}`);
        }
      } catch (err) {
        this.logger.warn(`[GC-Reconciliation] Failed to reconcile ${tx.requestId}: ${err}`);
      }
    }

    if (resolved) {
      this.logger.log(`[GC-Reconciliation] Settled ${resolved}/${pending.length} payment(s)`);
    }
  }
}

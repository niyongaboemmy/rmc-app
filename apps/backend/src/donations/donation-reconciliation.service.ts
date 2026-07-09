import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { DonationsService } from './donations.service';

/**
 * Periodically re-checks donations that are stuck in PENDING.
 *
 * IntouchPay's getTransactionStatus API can lag several minutes behind MTN's
 * actual outcome. Without this job, a donation stays PENDING forever when:
 *   - The callback URL is unreachable (localhost, firewall, etc.)
 *   - IntouchPay hasn't yet received MTN's failure/success notification
 *   - The frontend polling window (90 s) closed before IntouchPay updated
 *
 * Runs every 3 minutes. Only touches donations that are:
 *   - status = 'pending'
 *   - have a payment_reference (gateway-backed, not manual)
 *   - were created more than 3 minutes ago (give the normal flow time to finish)
 *   - were created less than 24 hours ago (ignore very old stuck records)
 */
@Injectable()
export class DonationReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DonationReconciliationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly RUN_INTERVAL_MS = 3 * 60 * 1000; // every 3 minutes
  private readonly MIN_AGE_MINUTES = 3; // skip donations < 3 min old
  private readonly MAX_AGE_HOURS = 24; // ignore very old stuck records

  constructor(
    @InjectRepository(Donation)
    private readonly repo: Repository<Donation>,
    private readonly donationsService: DonationsService,
  ) {}

  onModuleInit() {
    // Initial run after a short delay (let the app finish starting up)
    setTimeout(() => void this.reconcile(), 30_000);
    this.timer = setInterval(() => void this.reconcile(), this.RUN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(): Promise<void> {
    const minAge = new Date(Date.now() - this.MIN_AGE_MINUTES * 60 * 1000);
    const maxAge = new Date(Date.now() - this.MAX_AGE_HOURS * 60 * 60 * 1000);

    const stuckDonations = await this.repo.find({
      where: {
        status: DonationStatus.PENDING,
        donatedAt: LessThan(minAge),
      },
      order: { donatedAt: 'DESC' },
      take: 50,
    });

    // Filter: must have a payment reference and not be too old
    const toCheck = stuckDonations.filter((d) => d.paymentReference && d.donatedAt > maxAge);

    if (!toCheck.length) return;

    this.logger.log(`[Reconciliation] Checking ${toCheck.length} stuck pending donation(s)`);

    const results = await Promise.allSettled(
      toCheck.map((d) => this.donationsService.refreshPaymentStatus(d.id)),
    );

    let resolved = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.status !== DonationStatus.PENDING) {
        resolved++;
        this.logger.log(`[Reconciliation] Donation ${toCheck[i].id} → ${r.value.status}`);
      }
    });

    if (resolved) {
      this.logger.log(`[Reconciliation] Resolved ${resolved}/${toCheck.length} donation(s)`);
    }
  }
}

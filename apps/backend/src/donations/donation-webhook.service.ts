import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { SmsService } from '../integrations/sms/sms.service';
import { DonationSmsTemplates } from './donation-sms-templates';

/**
 * Processes IntouchPay payment callbacks for Donation records.
 *
 * Donation payment references are stored as either:
 *   "DON-{shortId}-{timestamp}"                    (gateway unreachable at initiation)
 *   "DON-{shortId}-{timestamp}|{gatewayTxnId}"     (normal flow)
 *
 * The IntouchPay callback carries `requesttransactionid = "DON-{shortId}-{timestamp}"`,
 * so we match on the prefix of the stored reference.
 */
@Injectable()
export class DonationWebhookService {
  private readonly logger = new Logger(DonationWebhookService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly repo: Repository<Donation>,
    private readonly smsService: SmsService,
  ) {}

  async handleCallback(payload: Record<string, string>): Promise<void> {
    const requestTxnId = payload['requesttransactionid'];
    if (!requestTxnId?.startsWith('DON-')) return;

    const rc = payload['responsecode'] ?? '';
    const statusText = (payload['status'] ?? '').toLowerCase();

    const isSuccess = statusText === 'successfull' || statusText === 'successful' || rc === '01';
    const isFailed = !isSuccess && rc !== '1000';

    if (!isSuccess && !isFailed) return; // still pending — nothing to update

    // Match "DON-xxx" (exact) or "DON-xxx|gatewayTxnId" (normal case).
    //
    // `find`, not `findOne`: a cart is several donations settled by one payment,
    // so they all share this reference. Updating only the first would leave the
    // rest pending forever while the donor's money had already arrived.
    const donations = await this.repo.find({
      where: [{ paymentReference: requestTxnId }, { paymentReference: Like(`${requestTxnId}|%`) }],
    });

    if (donations.length === 0) {
      this.logger.warn(`[DonationWebhook] No donation found for requestTxnId=${requestTxnId}`);
      return;
    }

    // Idempotent — a repeated notification must not re-credit anything.
    const pending = donations.filter((d) => d.status === DonationStatus.PENDING);
    if (pending.length === 0) {
      this.logger.log(
        `[DonationWebhook] ${donations.length} donation(s) for ${requestTxnId} already resolved — skipping`,
      );
      return;
    }

    for (const donation of pending) {
      donation.status = isSuccess ? DonationStatus.COMPLETED : DonationStatus.FAILED;
      donation.gatewayResponseCode = rc || null;
      donation.gatewayMessage = payload['message'] || null;
    }
    await this.repo.save(pending);

    this.logger.log(
      `[DonationWebhook] ${pending.length} donation(s) for ${requestTxnId} → ${
        isSuccess ? 'completed' : 'failed'
      } (rc=${rc})`,
    );

    // One payment, one SMS — the donor paid once and should be thanked once,
    // for the full amount rather than per basket line.
    const first = pending[0];
    if (isSuccess && first.donorPhone) {
      const total = pending.reduce((sum, d) => sum + Number(d.amount), 0);
      const msg = DonationSmsTemplates.paymentConfirmed(
        total.toLocaleString('en-US'),
        first.currency,
        first.donorName,
      );
      void this.smsService.sendSms(first.donorPhone, msg);
    }
  }
}

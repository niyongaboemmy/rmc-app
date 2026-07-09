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

    // Match "DON-xxx" (exact) or "DON-xxx|gatewayTxnId" (normal case)
    const donation = await this.repo.findOne({
      where: [{ paymentReference: requestTxnId }, { paymentReference: Like(`${requestTxnId}|%`) }],
    });

    if (!donation) {
      this.logger.warn(`[DonationWebhook] No donation found for requestTxnId=${requestTxnId}`);
      return;
    }

    // Idempotent — skip if already resolved
    if (donation.status !== DonationStatus.PENDING) {
      this.logger.log(
        `[DonationWebhook] Donation ${donation.id} already ${donation.status} — skipping`,
      );
      return;
    }

    const previousStatus = donation.status;
    donation.status = isSuccess ? DonationStatus.COMPLETED : DonationStatus.FAILED;
    await this.repo.save(donation);

    this.logger.log(
      `[DonationWebhook] Donation ${donation.id} ${previousStatus} → ${donation.status} (rc=${rc})`,
    );

    if (isSuccess && donation.donorPhone) {
      const amountStr = Number(donation.amount).toLocaleString('en-US');
      const msg = DonationSmsTemplates.paymentConfirmed(
        amountStr,
        donation.currency,
        donation.donorName,
      );
      void this.smsService.sendSms(donation.donorPhone, msg);
    }
  }
}

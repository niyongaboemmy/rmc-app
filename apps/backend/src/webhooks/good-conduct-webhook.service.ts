import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoodConductTransaction } from '../good-conduct/entities/good-conduct-transaction.entity';
import {
  GoodConductRequest,
  GoodConductStatus,
  PaymentStatus,
} from '../good-conduct/entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from '../good-conduct/entities/good-conduct-status-history.entity';
import { SmsTemplates } from '../good-conduct/sms-templates';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';

@Injectable()
export class GoodConductWebhookService {
  private readonly logger = new Logger(GoodConductWebhookService.name);

  constructor(
    @InjectRepository(GoodConductTransaction)
    private readonly txRepo: Repository<GoodConductTransaction>,

    @InjectRepository(GoodConductRequest)
    private readonly requestRepo: Repository<GoodConductRequest>,

    @InjectRepository(GoodConductStatusHistory)
    private readonly statusHistoryRepo: Repository<GoodConductStatusHistory>,

    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Checks if a payment callback belongs to a Good Conduct request
   * and updates the GoodConductTransaction + GoodConductRequest accordingly.
   */
  async handleCallback(payload: Record<string, string>): Promise<void> {
    const providerRef = payload['requesttransactionid'];
    const rc = payload['responsecode'];
    const statusText = (payload['status'] ?? '').toLowerCase();

    if (!providerRef) return;

    const tx = await this.txRepo.findOne({ where: { providerRef } });
    if (!tx) return; // not a Good Conduct payment

    const isSuccess = statusText === 'successfull' || statusText === 'successful' || rc === '01';
    const isFailed = !isSuccess && rc !== '1000';

    if (!isSuccess && !isFailed) return; // still pending

    tx.status = isSuccess ? 'completed' : 'failed';
    tx.completedAt = new Date();
    tx.metadata = { ...(tx.metadata ?? {}), callbackPayload: payload };
    await this.txRepo.save(tx);

    const request = await this.requestRepo.findOne({ where: { id: tx.requestId } });
    if (!request) return;

    if (isSuccess) {
      const prevStatus = request.status;
      request.paymentStatus = PaymentStatus.PAID;
      request.amountPaid = request.amountDue;

      if (request.status === GoodConductStatus.DRAFT) {
        request.status = GoodConductStatus.SUBMITTED;
        request.submittedAt = new Date();
      }
      await this.requestRepo.save(request);

      if (
        prevStatus === GoodConductStatus.DRAFT &&
        request.status === GoodConductStatus.SUBMITTED
      ) {
        await this.recordStatusChange(
          request.id,
          prevStatus,
          GoodConductStatus.SUBMITTED,
          null,
          'Payment confirmed via IntouchPay — request submitted',
        );
        this.sendSubmissionSms(request);
      }

      this.sendPaymentConfirmedSms(request);
    } else {
      // Payment failed — leave the request's own status untouched; only the
      // payment_status reflects the failure. Do not silently retry.
      request.paymentStatus = PaymentStatus.FAILED;
      await this.requestRepo.save(request);
    }

    this.logger.log(
      `[GoodConductWebhook] Request ${request.id} payment → ${request.paymentStatus}`,
    );
  }

  private async recordStatusChange(
    requestId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string | null,
    notes: string | null,
  ): Promise<GoodConductStatusHistory> {
    const history = this.statusHistoryRepo.create({
      requestId,
      fromStatus,
      toStatus,
      changedBy,
      notes,
    });
    return this.statusHistoryRepo.save(history);
  }

  // ── SMS notifications ────────────────────────────────────────────────────

  private shortRef(request: GoodConductRequest): string {
    return request.id.slice(0, 8).toUpperCase();
  }

  /** Fire-and-forget — never throws, so a failed SMS can't break webhook processing. */
  private dispatchSms(to: string, message: string): void {
    if (!to) {
      this.logger.warn('SMS skipped: no recipient phone number');
      return;
    }
    void this.smsService.sendSms(to, message);
  }

  private sendSubmissionSms(request: GoodConductRequest): void {
    if (!this.notifSettings.isSmsEnabled('goodConduct.submission')) return;
    this.dispatchSms(request.phone, SmsTemplates.submission(this.shortRef(request)));
  }

  private sendPaymentConfirmedSms(request: GoodConductRequest): void {
    if (!this.notifSettings.isSmsEnabled('goodConduct.payment_confirmed')) return;
    const amount = Number(request.amountPaid || request.amountDue).toLocaleString('en-RW');
    this.dispatchSms(request.phone, SmsTemplates.paymentConfirmed(this.shortRef(request), amount));
  }
}

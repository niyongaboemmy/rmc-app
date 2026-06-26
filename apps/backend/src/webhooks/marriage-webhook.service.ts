import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarriageTransaction } from '../marriage/entities/marriage-transaction.entity';
import {
  MarriageApplication,
  PaymentStatus,
} from '../marriage/entities/marriage-application.entity';

@Injectable()
export class MarriageWebhookService {
  private readonly logger = new Logger(MarriageWebhookService.name);

  constructor(
    @InjectRepository(MarriageTransaction)
    private readonly txRepo: Repository<MarriageTransaction>,

    @InjectRepository(MarriageApplication)
    private readonly appRepo: Repository<MarriageApplication>,
  ) {}

  /**
   * Checks if a payment callback belongs to a marriage application
   * and updates the MarriageTransaction + MarriageApplication accordingly.
   */
  async handleCallback(payload: Record<string, string>): Promise<void> {
    const providerRef = payload['requesttransactionid'];
    const rc = payload['responsecode'];
    const statusText = (payload['status'] ?? '').toLowerCase();

    if (!providerRef) return;

    const tx = await this.txRepo.findOne({ where: { providerRef } });
    if (!tx) return; // not a marriage payment

    const isSuccess = statusText === 'successfull' || statusText === 'successful' || rc === '01';
    const isFailed = !isSuccess && rc !== '1000';

    if (!isSuccess && !isFailed) return; // still pending

    tx.status = isSuccess ? 'completed' : 'failed';
    tx.completedAt = new Date();
    tx.metadata = { ...(tx.metadata ?? {}), callbackPayload: payload };
    await this.txRepo.save(tx);

    // Update the application payment status
    const app = await this.appRepo.findOne({ where: { id: tx.applicationId } });
    if (!app) return;

    if (isSuccess) {
      app.paymentStatus = PaymentStatus.PAID;
      app.amountPaid = app.amountDue;
    } else {
      app.paymentStatus = PaymentStatus.FAILED;
    }
    await this.appRepo.save(app);
    this.logger.log(
      `[MarriageWebhook] App ${app.applicationNumber} payment → ${app.paymentStatus}`,
    );
  }
}

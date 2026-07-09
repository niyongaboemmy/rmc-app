import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
import { GoodConductWebhookService } from './good-conduct-webhook.service';
import { MarriageTransaction } from '../marriage/entities/marriage-transaction.entity';
import { MarriageApplication } from '../marriage/entities/marriage-application.entity';
import { Donation } from '../donations/entities/donation.entity';
import { GoodConductTransaction } from '../good-conduct/entities/good-conduct-transaction.entity';
import { GoodConductRequest } from '../good-conduct/entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from '../good-conduct/entities/good-conduct-status-history.entity';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarriageTransaction,
      MarriageApplication,
      Donation,
      GoodConductTransaction,
      GoodConductRequest,
      GoodConductStatusHistory,
    ]),
    PaymentSettingsModule,
    SmsModule,
    NotificationSettingsModule,
  ],
  providers: [MarriageWebhookService, DonationWebhookService, GoodConductWebhookService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

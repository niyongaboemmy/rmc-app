import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { MarriageWebhookService } from './marriage-webhook.service';
import { DonationWebhookService } from '../donations/donation-webhook.service';
import { MarriageTransaction } from '../marriage/entities/marriage-transaction.entity';
import { MarriageApplication } from '../marriage/entities/marriage-application.entity';
import { Donation } from '../donations/entities/donation.entity';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarriageTransaction, MarriageApplication, Donation]),
    PaymentSettingsModule,
    SmsModule,
  ],
  providers: [MarriageWebhookService, DonationWebhookService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

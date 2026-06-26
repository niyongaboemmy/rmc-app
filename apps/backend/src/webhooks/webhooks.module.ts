import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { MarriageWebhookService } from './marriage-webhook.service';
import { MarriageTransaction } from '../marriage/entities/marriage-transaction.entity';
import { MarriageApplication } from '../marriage/entities/marriage-application.entity';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarriageTransaction, MarriageApplication]),
    PaymentSettingsModule,
  ],
  providers: [MarriageWebhookService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

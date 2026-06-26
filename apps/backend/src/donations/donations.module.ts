import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationSubFund } from './entities/donation-subfund.entity';
import { DonationsService } from './donations.service';
import { DonationCategoriesService } from './donation-categories.service';
import { DonationReconciliationService } from './donation-reconciliation.service';
import { DonationsController } from './donations.controller';
import { DonationsAdminController } from './donations-admin.controller';
import { DonationCategoriesController } from './donation-categories.controller';
import { DonationCategoriesAdminController } from './donation-categories-admin.controller';
import { IntouchPayModule } from '../integrations/intouch-pay/intouch-pay.module';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCampaign, DonationCategory, DonationSubFund]),
    IntouchPayModule,
    PaymentSettingsModule,
    SmsModule,
  ],
  providers: [DonationsService, DonationCategoriesService, DonationReconciliationService],
  controllers: [
    DonationsController,
    DonationsAdminController,
    DonationCategoriesController,
    DonationCategoriesAdminController,
  ],
  exports: [DonationsService],
})
export class DonationsModule {}

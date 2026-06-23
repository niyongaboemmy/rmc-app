import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationSubFund } from './entities/donation-subfund.entity';
import { DonationsService } from './donations.service';
import { DonationCategoriesService } from './donation-categories.service';
import { DonationsController } from './donations.controller';
import { DonationsAdminController } from './donations-admin.controller';
import { DonationCategoriesController } from './donation-categories.controller';
import { DonationCategoriesAdminController } from './donation-categories-admin.controller';
import { MoMoModule } from '../integrations/momo/momo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCampaign, DonationCategory, DonationSubFund]),
    MoMoModule,
  ],
  providers: [DonationsService, DonationCategoriesService],
  controllers: [
    DonationsController,
    DonationsAdminController,
    DonationCategoriesController,
    DonationCategoriesAdminController,
  ],
  exports: [DonationsService],
})
export class DonationsModule {}

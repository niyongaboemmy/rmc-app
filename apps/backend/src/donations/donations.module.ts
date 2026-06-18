import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { DonationsAdminController } from './donations-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonationCampaign])],
  providers: [DonationsService],
  controllers: [DonationsController, DonationsAdminController],
  exports: [DonationsService],
})
export class DonationsModule {}

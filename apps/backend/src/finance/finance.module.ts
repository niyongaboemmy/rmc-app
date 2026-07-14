import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { Donation } from '../donations/entities/donation.entity';
import { MarriageApplication } from '../marriage/entities/marriage-application.entity';

/**
 * Cross-cutting finance reporting. The payment ledger spans donations and marriage
 * payments, so it lives here rather than in either module — it only reads their
 * tables and owns no schema of its own.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Donation, MarriageApplication])],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}

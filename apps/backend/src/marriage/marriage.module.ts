import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarriageApplication } from './entities/marriage-application.entity';
import { MarriageDocument } from './entities/marriage-document.entity';
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import { MarriageService } from './marriage.service';
import { MarriageController } from './marriage.controller';
import { MarriageAdminController } from './marriage-admin.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarriageApplication,
      MarriageDocument,
      MarriageStatusHistory,
      MarriageTransaction,
      User,
    ]),
  ],
  providers: [MarriageService],
  controllers: [MarriageController, MarriageAdminController],
  exports: [MarriageService],
})
export class MarriageModule {}

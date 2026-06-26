import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarriageApplication } from './entities/marriage-application.entity';
import { MarriageDocument } from './entities/marriage-document.entity';
import { MarriageStatusHistory } from './entities/marriage-status-history.entity';
import { MarriageTransaction } from './entities/marriage-transaction.entity';
import { MarriagePartyConfirmation } from './entities/marriage-party-confirmation.entity';
import { MarriageService } from './marriage.service';
import { MarriageController } from './marriage.controller';
import { MarriageAdminController } from './marriage-admin.controller';
import { User } from '../users/entities/user.entity';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    TypeOrmModule.forFeature([
      MarriageApplication,
      MarriageDocument,
      MarriageStatusHistory,
      MarriageTransaction,
      MarriagePartyConfirmation,
      User,
    ]),
  ],
  providers: [MarriageService],
  controllers: [MarriageController, MarriageAdminController],
  exports: [MarriageService],
})
export class MarriageModule {}

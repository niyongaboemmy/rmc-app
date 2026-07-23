import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenderApplication } from './entities/tender-application.entity';
import { TenderApplicationDocument } from './entities/tender-application-document.entity';
import { TenderApplicationStatusHistory } from './entities/tender-application-status-history.entity';
import { TendersService } from './tenders.service';
import { TendersController } from './tenders.controller';
import { TendersAdminController } from './tenders-admin.controller';
import { Announcement } from '../public/entities/announcement.entity';
import { User } from '../users/entities/user.entity';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { EmailModule } from '../integrations/email/email.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    EmailModule,
    // `Announcement` is registered here read-only — tenders are announcement rows
    // (type='tender'), so this module needs to look them up to validate a bid's
    // target and deadline. It never writes to them; PublicModule owns that.
    TypeOrmModule.forFeature([
      TenderApplication,
      TenderApplicationDocument,
      TenderApplicationStatusHistory,
      Announcement,
      User,
    ]),
  ],
  providers: [TendersService],
  controllers: [TendersController, TendersAdminController],
  exports: [TendersService],
})
export class TendersModule {}

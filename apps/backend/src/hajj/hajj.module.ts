import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HajjApplication } from './entities/hajj-application.entity';
import { HajjStatusHistory } from './entities/hajj-status-history.entity';
import { HajjDocument } from './entities/hajj-document.entity';
import { HajjRequirement } from './entities/hajj-requirement.entity';
import { HajjBankAccount } from './entities/hajj-bank-account.entity';
import { HajjService } from './hajj.service';
import { HajjRequirementService } from './hajj-requirement.service';
import { HajjBankAccountService } from './hajj-bank-account.service';
import { HajjController } from './hajj.controller';
import { HajjAdminController } from './hajj-admin.controller';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { EmailModule } from '../integrations/email/email.module';
import { PublicUploadModule } from '../integrations/storage/public-upload.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    EmailModule,
    PublicUploadModule,
    TrackingModule,
    TypeOrmModule.forFeature([
      HajjApplication,
      HajjStatusHistory,
      HajjDocument,
      HajjRequirement,
      HajjBankAccount,
    ]),
  ],
  providers: [HajjService, HajjRequirementService, HajjBankAccountService],
  controllers: [HajjController, HajjAdminController],
  exports: [HajjService, HajjRequirementService, HajjBankAccountService],
})
export class HajjModule {}

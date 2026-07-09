import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodConductRequest } from './entities/good-conduct-request.entity';
import { GoodConductStatusHistory } from './entities/good-conduct-status-history.entity';
import { GoodConductTransaction } from './entities/good-conduct-transaction.entity';
import { GoodConductService } from './good-conduct.service';
import { GoodConductController } from './good-conduct.controller';
import { GoodConductAdminController } from './good-conduct-admin.controller';
import { User } from '../users/entities/user.entity';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { EmailModule } from '../integrations/email/email.module';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { IntouchPayModule } from '../integrations/intouch-pay/intouch-pay.module';
import { MosquesModule } from '../mosques/mosques.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    EmailModule,
    PaymentSettingsModule,
    IntouchPayModule,
    MosquesModule,
    LocationsModule,
    TypeOrmModule.forFeature([
      GoodConductRequest,
      GoodConductStatusHistory,
      GoodConductTransaction,
      User,
    ]),
  ],
  providers: [GoodConductService],
  controllers: [GoodConductController, GoodConductAdminController],
  exports: [GoodConductService],
})
export class GoodConductModule {}

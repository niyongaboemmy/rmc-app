import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentMethodSettings } from './entities/payment-method-settings.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentEventsService } from './payment-events.service';
import { IntouchPayModule } from '../integrations/intouch-pay/intouch-pay.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentType,
      PaymentTypeRate,
      PaymentMethodSettings,
      PaymentTransaction,
    ]),
    IntouchPayModule,
  ],
  providers: [PaymentSettingsService, PaymentEventsService],
  controllers: [PaymentSettingsController],
  exports: [PaymentSettingsService, PaymentEventsService],
})
export class PaymentSettingsModule {}

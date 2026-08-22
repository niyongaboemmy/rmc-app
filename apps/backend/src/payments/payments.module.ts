import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from '../payment-settings/entities/payment-transaction.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { IremboPayAdminController } from './irembopay-admin.controller';
import { PaymentsPublicController } from './payments-public.controller';
import { IntouchPayProvider } from './providers/intouch-pay.provider';
import { IremboPayProvider } from './providers/irembo-pay.provider';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { IntouchPayModule } from '../integrations/intouch-pay/intouch-pay.module';
import { IremboPayModule } from '../integrations/irembo-pay/irembo-pay.module';

/**
 * The gateway port and its providers. Domain modules import this instead of
 * injecting a concrete gateway service.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction]),
    PaymentSettingsModule,
    IntouchPayModule,
    IremboPayModule,
  ],
  providers: [PaymentGatewayService, IntouchPayProvider, IremboPayProvider],
  controllers: [IremboPayAdminController, PaymentsPublicController],
  exports: [PaymentGatewayService, IremboPayProvider],
})
export class PaymentsModule {}

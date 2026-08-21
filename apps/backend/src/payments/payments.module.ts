import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { IremboPayAdminController } from './irembopay-admin.controller';
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
  imports: [PaymentSettingsModule, IntouchPayModule, IremboPayModule],
  providers: [PaymentGatewayService, IntouchPayProvider, IremboPayProvider],
  controllers: [IremboPayAdminController],
  exports: [PaymentGatewayService, IremboPayProvider],
})
export class PaymentsModule {}

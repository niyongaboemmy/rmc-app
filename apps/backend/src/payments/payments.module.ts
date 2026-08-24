import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from '../payment-settings/entities/payment-transaction.entity';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentProviderEventsService } from './payment-provider-events.service';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentDiagnosticsController } from './payment-diagnostics.controller';
import { IremboPayAdminController } from './irembopay-admin.controller';
import { PaymentsPublicController } from './payments-public.controller';
import { IremboPayProvider } from './providers/irembo-pay.provider';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { IremboPayModule } from '../integrations/irembo-pay/irembo-pay.module';

/**
 * The gateway port, its providers, and the provider-neutral telemetry that sits
 * beside them. Domain modules import this instead of injecting a concrete
 * gateway service.
 *
 * The telemetry entity and services live here rather than under any one
 * `integrations/` folder deliberately: they outlive individual providers, and
 * housing them inside a provider's folder is what made retiring IntouchPay a
 * migration rather than a deletion.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, PaymentProviderEvent]),
    PaymentSettingsModule,
    IremboPayModule,
  ],
  providers: [
    PaymentGatewayService,
    IremboPayProvider,
    PaymentProviderEventsService,
    PaymentSimulatorService,
  ],
  controllers: [IremboPayAdminController, PaymentsPublicController, PaymentDiagnosticsController],
  exports: [
    PaymentGatewayService,
    IremboPayProvider,
    PaymentProviderEventsService,
    PaymentSimulatorService,
  ],
})
export class PaymentsModule {}

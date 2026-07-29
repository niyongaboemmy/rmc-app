import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntouchPayService } from './intouch-pay.service';
import { PaymentEventsService } from './payment-events.service';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentDiagnosticsController } from './payment-diagnostics.controller';
import { PaymentProviderEvent } from './entities/payment-provider-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentProviderEvent])],
  providers: [IntouchPayService, PaymentEventsService, PaymentSimulatorService],
  controllers: [PaymentDiagnosticsController],
  exports: [IntouchPayService, PaymentEventsService, PaymentSimulatorService],
})
export class IntouchPayModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentProviderEvent } from '../../payments/entities/payment-provider-event.entity';
import { IremboPayInvoice } from './entities/irembopay-invoice.entity';
import { IremboPayClient } from './irembo-pay.client';
import { IremboPayConfigService } from './irembo-pay.config.service';
import { IremboPayService } from './irembo-pay.service';
import { IremboPayInvoiceService } from './irembopay-invoice.service';
import { IremboPayReconciliationService } from './irembopay-reconciliation.service';
import { InvoiceSettlementBus } from './invoice-settlement.bus';
import { PaymentTransaction } from '../../payment-settings/entities/payment-transaction.entity';
import { PaymentSettingsModule } from '../../payment-settings/payment-settings.module';

/**
 * The IremboPay HTTP integration: config resolution, the client, and the typed
 * endpoint wrapper. Business logic lives in `payments/providers`, not here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentProviderEvent, IremboPayInvoice, PaymentTransaction]),
    PaymentSettingsModule,
  ],
  providers: [
    IremboPayConfigService,
    IremboPayClient,
    IremboPayService,
    IremboPayInvoiceService,
    IremboPayReconciliationService,
    InvoiceSettlementBus,
  ],
  exports: [
    IremboPayConfigService,
    IremboPayClient,
    IremboPayService,
    IremboPayInvoiceService,
    IremboPayReconciliationService,
    InvoiceSettlementBus,
    TypeOrmModule,
  ],
})
export class IremboPayModule {}

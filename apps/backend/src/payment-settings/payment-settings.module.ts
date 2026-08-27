import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentMethodSettings } from './entities/payment-method-settings.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentTypeProviderProduct } from './entities/payment-type-provider-product.entity';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentEventsService } from './payment-events.service';
import { ProviderProductsService } from './provider-products.service';
import { SettingsCacheBus } from './settings-cache.bus';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentType,
      PaymentTypeRate,
      PaymentMethodSettings,
      PaymentTransaction,
      PaymentTypeProviderProduct,
    ]),
  ],
  providers: [
    PaymentSettingsService,
    PaymentEventsService,
    ProviderProductsService,
    SettingsCacheBus,
  ],
  controllers: [PaymentSettingsController],
  exports: [
    PaymentSettingsService,
    PaymentEventsService,
    ProviderProductsService,
    SettingsCacheBus,
  ],
})
export class PaymentSettingsModule {}

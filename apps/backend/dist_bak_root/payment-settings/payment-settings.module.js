"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const payment_method_entity_1 = require("./entities/payment-method.entity");
const payment_type_entity_1 = require("./entities/payment-type.entity");
const payment_type_rate_entity_1 = require("./entities/payment-type-rate.entity");
const payment_method_settings_entity_1 = require("./entities/payment-method-settings.entity");
const payment_transaction_entity_1 = require("./entities/payment-transaction.entity");
const payment_settings_service_1 = require("./payment-settings.service");
const payment_settings_controller_1 = require("./payment-settings.controller");
const payment_events_service_1 = require("./payment-events.service");
const intouch_pay_module_1 = require("../integrations/intouch-pay/intouch-pay.module");
let PaymentSettingsModule = class PaymentSettingsModule {
};
exports.PaymentSettingsModule = PaymentSettingsModule;
exports.PaymentSettingsModule = PaymentSettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                payment_method_entity_1.PaymentMethod,
                payment_type_entity_1.PaymentType,
                payment_type_rate_entity_1.PaymentTypeRate,
                payment_method_settings_entity_1.PaymentMethodSettings,
                payment_transaction_entity_1.PaymentTransaction,
            ]),
            intouch_pay_module_1.IntouchPayModule,
        ],
        providers: [payment_settings_service_1.PaymentSettingsService, payment_events_service_1.PaymentEventsService],
        controllers: [payment_settings_controller_1.PaymentSettingsController],
        exports: [payment_settings_service_1.PaymentSettingsService, payment_events_service_1.PaymentEventsService],
    })
], PaymentSettingsModule);
//# sourceMappingURL=payment-settings.module.js.map
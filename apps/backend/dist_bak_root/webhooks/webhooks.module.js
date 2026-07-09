"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const webhooks_controller_1 = require("./webhooks.controller");
const marriage_webhook_service_1 = require("./marriage-webhook.service");
const donation_webhook_service_1 = require("../donations/donation-webhook.service");
const marriage_transaction_entity_1 = require("../marriage/entities/marriage-transaction.entity");
const marriage_application_entity_1 = require("../marriage/entities/marriage-application.entity");
const donation_entity_1 = require("../donations/entities/donation.entity");
const payment_settings_module_1 = require("../payment-settings/payment-settings.module");
const sms_module_1 = require("../integrations/sms/sms.module");
let WebhooksModule = class WebhooksModule {
};
exports.WebhooksModule = WebhooksModule;
exports.WebhooksModule = WebhooksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([marriage_transaction_entity_1.MarriageTransaction, marriage_application_entity_1.MarriageApplication, donation_entity_1.Donation]),
            payment_settings_module_1.PaymentSettingsModule,
            sms_module_1.SmsModule,
        ],
        providers: [marriage_webhook_service_1.MarriageWebhookService, donation_webhook_service_1.DonationWebhookService],
        controllers: [webhooks_controller_1.WebhooksController],
    })
], WebhooksModule);
//# sourceMappingURL=webhooks.module.js.map
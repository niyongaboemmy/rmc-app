"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const marriage_application_entity_1 = require("./entities/marriage-application.entity");
const marriage_document_entity_1 = require("./entities/marriage-document.entity");
const marriage_status_history_entity_1 = require("./entities/marriage-status-history.entity");
const marriage_transaction_entity_1 = require("./entities/marriage-transaction.entity");
const marriage_party_confirmation_entity_1 = require("./entities/marriage-party-confirmation.entity");
const marriage_service_1 = require("./marriage.service");
const marriage_controller_1 = require("./marriage.controller");
const marriage_admin_controller_1 = require("./marriage-admin.controller");
const user_entity_1 = require("../users/entities/user.entity");
const notification_settings_module_1 = require("../integrations/notifications/notification-settings.module");
const sms_module_1 = require("../integrations/sms/sms.module");
const payment_settings_module_1 = require("../payment-settings/payment-settings.module");
const intouch_pay_module_1 = require("../integrations/intouch-pay/intouch-pay.module");
let MarriageModule = class MarriageModule {
};
exports.MarriageModule = MarriageModule;
exports.MarriageModule = MarriageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notification_settings_module_1.NotificationSettingsModule,
            sms_module_1.SmsModule,
            payment_settings_module_1.PaymentSettingsModule,
            intouch_pay_module_1.IntouchPayModule,
            typeorm_1.TypeOrmModule.forFeature([
                marriage_application_entity_1.MarriageApplication,
                marriage_document_entity_1.MarriageDocument,
                marriage_status_history_entity_1.MarriageStatusHistory,
                marriage_transaction_entity_1.MarriageTransaction,
                marriage_party_confirmation_entity_1.MarriagePartyConfirmation,
                user_entity_1.User,
            ]),
        ],
        providers: [marriage_service_1.MarriageService],
        controllers: [marriage_controller_1.MarriageController, marriage_admin_controller_1.MarriageAdminController],
        exports: [marriage_service_1.MarriageService],
    })
], MarriageModule);
//# sourceMappingURL=marriage.module.js.map
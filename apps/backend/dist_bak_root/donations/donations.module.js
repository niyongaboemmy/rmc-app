"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const donation_entity_1 = require("./entities/donation.entity");
const donation_campaign_entity_1 = require("./entities/donation-campaign.entity");
const donation_category_entity_1 = require("./entities/donation-category.entity");
const donation_subfund_entity_1 = require("./entities/donation-subfund.entity");
const donations_service_1 = require("./donations.service");
const donation_categories_service_1 = require("./donation-categories.service");
const donation_reconciliation_service_1 = require("./donation-reconciliation.service");
const donations_controller_1 = require("./donations.controller");
const donations_admin_controller_1 = require("./donations-admin.controller");
const donation_categories_controller_1 = require("./donation-categories.controller");
const donation_categories_admin_controller_1 = require("./donation-categories-admin.controller");
const intouch_pay_module_1 = require("../integrations/intouch-pay/intouch-pay.module");
const payment_settings_module_1 = require("../payment-settings/payment-settings.module");
const sms_module_1 = require("../integrations/sms/sms.module");
let DonationsModule = class DonationsModule {
};
exports.DonationsModule = DonationsModule;
exports.DonationsModule = DonationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([donation_entity_1.Donation, donation_campaign_entity_1.DonationCampaign, donation_category_entity_1.DonationCategory, donation_subfund_entity_1.DonationSubFund]),
            intouch_pay_module_1.IntouchPayModule,
            payment_settings_module_1.PaymentSettingsModule,
            sms_module_1.SmsModule,
        ],
        providers: [donations_service_1.DonationsService, donation_categories_service_1.DonationCategoriesService, donation_reconciliation_service_1.DonationReconciliationService],
        controllers: [
            donations_controller_1.DonationsController,
            donations_admin_controller_1.DonationsAdminController,
            donation_categories_controller_1.DonationCategoriesController,
            donation_categories_admin_controller_1.DonationCategoriesAdminController,
        ],
        exports: [donations_service_1.DonationsService],
    })
], DonationsModule);
//# sourceMappingURL=donations.module.js.map
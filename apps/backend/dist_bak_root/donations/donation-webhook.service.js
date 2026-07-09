"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DonationWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationWebhookService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const donation_entity_1 = require("./entities/donation.entity");
const sms_service_1 = require("../integrations/sms/sms.service");
const donation_sms_templates_1 = require("./donation-sms-templates");
let DonationWebhookService = DonationWebhookService_1 = class DonationWebhookService {
    constructor(repo, smsService) {
        this.repo = repo;
        this.smsService = smsService;
        this.logger = new common_1.Logger(DonationWebhookService_1.name);
    }
    async handleCallback(payload) {
        const requestTxnId = payload['requesttransactionid'];
        if (!requestTxnId?.startsWith('DON-'))
            return;
        const rc = payload['responsecode'] ?? '';
        const statusText = (payload['status'] ?? '').toLowerCase();
        const isSuccess = statusText === 'successfull' || statusText === 'successful' || rc === '01';
        const isFailed = !isSuccess && rc !== '1000';
        if (!isSuccess && !isFailed)
            return;
        const donation = await this.repo.findOne({
            where: [
                { paymentReference: requestTxnId },
                { paymentReference: (0, typeorm_2.Like)(`${requestTxnId}|%`) },
            ],
        });
        if (!donation) {
            this.logger.warn(`[DonationWebhook] No donation found for requestTxnId=${requestTxnId}`);
            return;
        }
        if (donation.status !== donation_entity_1.DonationStatus.PENDING) {
            this.logger.log(`[DonationWebhook] Donation ${donation.id} already ${donation.status} — skipping`);
            return;
        }
        const previousStatus = donation.status;
        donation.status = isSuccess ? donation_entity_1.DonationStatus.COMPLETED : donation_entity_1.DonationStatus.FAILED;
        await this.repo.save(donation);
        this.logger.log(`[DonationWebhook] Donation ${donation.id} ${previousStatus} → ${donation.status} (rc=${rc})`);
        if (isSuccess && donation.donorPhone) {
            const amountStr = Number(donation.amount).toLocaleString('en-US');
            const msg = donation_sms_templates_1.DonationSmsTemplates.paymentConfirmed(amountStr, donation.currency, donation.donorName);
            void this.smsService.sendSms(donation.donorPhone, msg);
        }
    }
};
exports.DonationWebhookService = DonationWebhookService;
exports.DonationWebhookService = DonationWebhookService = DonationWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(donation_entity_1.Donation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sms_service_1.SmsService])
], DonationWebhookService);
//# sourceMappingURL=donation-webhook.service.js.map
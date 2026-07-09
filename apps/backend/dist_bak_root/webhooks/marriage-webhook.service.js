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
var MarriageWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageWebhookService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const marriage_transaction_entity_1 = require("../marriage/entities/marriage-transaction.entity");
const marriage_application_entity_1 = require("../marriage/entities/marriage-application.entity");
let MarriageWebhookService = MarriageWebhookService_1 = class MarriageWebhookService {
    constructor(txRepo, appRepo) {
        this.txRepo = txRepo;
        this.appRepo = appRepo;
        this.logger = new common_1.Logger(MarriageWebhookService_1.name);
    }
    async handleCallback(payload) {
        const providerRef = payload['requesttransactionid'];
        const rc = payload['responsecode'];
        const statusText = (payload['status'] ?? '').toLowerCase();
        if (!providerRef)
            return;
        const tx = await this.txRepo.findOne({ where: { providerRef } });
        if (!tx)
            return;
        const isSuccess = statusText === 'successfull' || statusText === 'successful' || rc === '01';
        const isFailed = !isSuccess && rc !== '1000';
        if (!isSuccess && !isFailed)
            return;
        tx.status = isSuccess ? 'completed' : 'failed';
        tx.completedAt = new Date();
        tx.metadata = { ...(tx.metadata ?? {}), callbackPayload: payload };
        await this.txRepo.save(tx);
        const app = await this.appRepo.findOne({ where: { id: tx.applicationId } });
        if (!app)
            return;
        if (isSuccess) {
            app.paymentStatus = marriage_application_entity_1.PaymentStatus.PAID;
            app.amountPaid = app.amountDue;
        }
        else {
            app.paymentStatus = marriage_application_entity_1.PaymentStatus.FAILED;
        }
        await this.appRepo.save(app);
        this.logger.log(`[MarriageWebhook] App ${app.applicationNumber} payment → ${app.paymentStatus}`);
    }
};
exports.MarriageWebhookService = MarriageWebhookService;
exports.MarriageWebhookService = MarriageWebhookService = MarriageWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(marriage_transaction_entity_1.MarriageTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(marriage_application_entity_1.MarriageApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MarriageWebhookService);
//# sourceMappingURL=marriage-webhook.service.js.map
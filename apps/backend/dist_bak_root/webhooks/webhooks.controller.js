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
var WebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const skip_transform_decorator_1 = require("../common/decorators/skip-transform.decorator");
const payment_settings_service_1 = require("../payment-settings/payment-settings.service");
const payment_events_service_1 = require("../payment-settings/payment-events.service");
const marriage_webhook_service_1 = require("./marriage-webhook.service");
const donation_webhook_service_1 = require("../donations/donation-webhook.service");
let WebhooksController = WebhooksController_1 = class WebhooksController {
    constructor(paymentSettings, paymentEvents, marriageWebhook, donationWebhook) {
        this.paymentSettings = paymentSettings;
        this.paymentEvents = paymentEvents;
        this.marriageWebhook = marriageWebhook;
        this.donationWebhook = donationWebhook;
        this.logger = new common_1.Logger(WebhooksController_1.name);
    }
    async intouchPayCallback(body) {
        const raw = body['jsonpayload'] ?? body;
        const payload = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? '')]));
        this.logger.log(`[IntouchPay Callback] txn=${payload['requesttransactionid']} status=${payload['status']} code=${payload['responsecode']}`);
        try {
            const result = await this.paymentSettings.handleIntouchCallback(payload);
            if (result) {
                const eventType = result.resolvedStatus === 'SUCCESSFUL'
                    ? 'payment.confirmed'
                    : result.resolvedStatus === 'FAILED'
                        ? 'payment.failed'
                        : 'payment.pending';
                this.paymentEvents.emit({
                    type: eventType,
                    requestTransactionId: result.requestTransactionId,
                    transactionId: result.transactionId,
                    status: result.resolvedStatus,
                    responseCode: result.responseCode,
                    message: result.message,
                });
            }
            await this.marriageWebhook.handleCallback(payload);
            await this.donationWebhook.handleCallback(payload);
        }
        catch (err) {
            this.logger.error(`[IntouchPay Callback] Processing error: ${err}`);
        }
        return {
            message: 'success',
            success: true,
            request_id: payload['requesttransactionid'] ?? '',
        };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, skip_transform_decorator_1.SkipTransform)(),
    (0, common_1.Post)('intouch-pay'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'IntouchPay payment callback (public webhook)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "intouchPayCallback", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [payment_settings_service_1.PaymentSettingsService,
        payment_events_service_1.PaymentEventsService,
        marriage_webhook_service_1.MarriageWebhookService,
        donation_webhook_service_1.DonationWebhookService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const payment_settings_service_1 = require("./payment-settings.service");
const payment_events_service_1 = require("./payment-events.service");
const update_payment_method_dto_1 = require("./dto/update-payment-method.dto");
const update_payment_type_dto_1 = require("./dto/update-payment-type.dto");
const upsert_payment_method_settings_dto_1 = require("./dto/upsert-payment-method-settings.dto");
const upsert_payment_type_rate_dto_1 = require("./dto/upsert-payment-type-rate.dto");
const test_payment_dto_1 = require("./dto/test-payment.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
const user_entity_1 = require("../users/entities/user.entity");
let PaymentSettingsController = class PaymentSettingsController {
    constructor(service, events) {
        this.service = service;
        this.events = events;
    }
    findAllMethods() {
        return this.service.findAllMethods();
    }
    updateMethod(id, dto) {
        return this.service.updateMethod(id, dto);
    }
    toggleMethod(id) {
        return this.service.toggleMethodActive(id);
    }
    findAllTypes() {
        return this.service.findAllTypes();
    }
    updateType(id, dto) {
        return this.service.updateType(id, dto);
    }
    toggleType(id) {
        return this.service.toggleTypeActive(id);
    }
    listRates(id) {
        return this.service.findTypeRates(id);
    }
    createRate(id, dto) {
        return this.service.createRate(id, dto);
    }
    updateRate(id, rateId, dto) {
        return this.service.updateRate(id, rateId, dto);
    }
    toggleRate(id, rateId) {
        return this.service.toggleRateActive(id, rateId);
    }
    deleteRate(id, rateId) {
        return this.service.deleteRate(id, rateId);
    }
    getMethodSettings(id, reveal) {
        return this.service.getMethodSettings(id, reveal === 'true');
    }
    upsertMethodSettings(id, dto) {
        return this.service.upsertMethodSettings(id, dto);
    }
    testPayment(user, dto) {
        return this.service.testPayment(dto, user.id);
    }
    checkPaymentStatus(txId) {
        return this.service.checkTransactionStatus(txId);
    }
    listTransactions(isTest, status, paymentTypeKey, page, limit) {
        return this.service.listTransactions({
            isTest: isTest !== undefined ? isTest === 'true' : undefined,
            status,
            paymentTypeKey,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    getBalance() {
        return this.service.getAccountBalance();
    }
    paymentEvents() {
        return this.events.stream$.pipe((0, operators_1.map)((data) => ({ data })));
    }
};
exports.PaymentSettingsController = PaymentSettingsController;
__decorate([
    (0, common_1.Get)('methods'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List all payment methods' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "findAllMethods", null);
__decorate([
    (0, common_1.Patch)('methods/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a payment method' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_method_dto_1.UpdatePaymentMethodDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "updateMethod", null);
__decorate([
    (0, common_1.Patch)('methods/:id/toggle'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle a payment method active/inactive' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "toggleMethod", null);
__decorate([
    (0, common_1.Get)('types'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List all payment types (service areas)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "findAllTypes", null);
__decorate([
    (0, common_1.Patch)('types/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update name, description or default amount of a payment type' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_type_dto_1.UpdatePaymentTypeDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "updateType", null);
__decorate([
    (0, common_1.Patch)('types/:id/toggle'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle a payment type active/inactive' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "toggleType", null);
__decorate([
    (0, common_1.Get)('types/:id/rates'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List rates/sub-categories for a payment type' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "listRates", null);
__decorate([
    (0, common_1.Post)('types/:id/rates'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Add a rate/sub-category to a payment type' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upsert_payment_type_rate_dto_1.UpsertPaymentTypeRateDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "createRate", null);
__decorate([
    (0, common_1.Patch)('types/:id/rates/:rateId'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a rate/sub-category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('rateId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, upsert_payment_type_rate_dto_1.UpsertPaymentTypeRateDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "updateRate", null);
__decorate([
    (0, common_1.Patch)('types/:id/rates/:rateId/toggle'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle a rate active/inactive' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('rateId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "toggleRate", null);
__decorate([
    (0, common_1.Delete)('types/:id/rates/:rateId'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a rate/sub-category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('rateId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "deleteRate", null);
__decorate([
    (0, common_1.Get)('methods/:id/settings'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get credentials for a payment method (sensitive fields masked)' }),
    (0, swagger_1.ApiQuery)({ name: 'reveal', required: false, type: Boolean }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('reveal')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "getMethodSettings", null);
__decorate([
    (0, common_1.Put)('methods/:id/settings'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Save credentials for a payment method' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upsert_payment_method_settings_dto_1.UpsertPaymentMethodSettingsDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "upsertMethodSettings", null);
__decorate([
    (0, common_1.Post)('test/payment'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Send a test payment request via IntouchPay MoMo' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, test_payment_dto_1.TestPaymentDto]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "testPayment", null);
__decorate([
    (0, common_1.Get)('test/payment/:txId/status'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Check payment status for a transaction' }),
    __param(0, (0, common_1.Param)('txId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "checkPaymentStatus", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List payment transactions (test and live)' }),
    (0, swagger_1.ApiQuery)({ name: 'isTest', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'paymentTypeKey', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('isTest')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('paymentTypeKey')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Query IntouchPay account balance' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentSettingsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Sse)('events'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.PAYMENT_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'SSE stream — emits payment callback events in real time' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], PaymentSettingsController.prototype, "paymentEvents", null);
exports.PaymentSettingsController = PaymentSettingsController = __decorate([
    (0, swagger_1.ApiTags)('Payment Settings — Admin'),
    (0, common_1.Controller)('admin/payment-settings'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [payment_settings_service_1.PaymentSettingsService,
        payment_events_service_1.PaymentEventsService])
], PaymentSettingsController);
//# sourceMappingURL=payment-settings.controller.js.map
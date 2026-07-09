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
exports.SmsConfigAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../../common/types/permissions.enum");
const sms_config_service_1 = require("./sms-config.service");
const sms_service_1 = require("./sms.service");
const update_sms_config_dto_1 = require("./dto/update-sms-config.dto");
const test_sms_dto_1 = require("./dto/test-sms.dto");
let SmsConfigAdminController = class SmsConfigAdminController {
    constructor(smsConfig, sms) {
        this.smsConfig = smsConfig;
        this.sms = sms;
    }
    getConfig() {
        return this.smsConfig.getForAdmin();
    }
    async updateConfig(dto) {
        await this.smsConfig.update(dto);
        return { message: 'SMS configuration updated successfully.' };
    }
    async activate() {
        await this.smsConfig.setActive(true);
        return { message: 'SMS gateway activated.' };
    }
    async deactivate() {
        await this.smsConfig.setActive(false);
        return { message: 'SMS gateway deactivated.' };
    }
    async refreshCache() {
        await this.smsConfig.refreshCache();
        return { message: 'SMS config cache refreshed.' };
    }
    getHistory(page = '1', limit = '20') {
        return this.smsConfig.getHistory(Number(page), Number(limit));
    }
    async testSms(dto) {
        const result = await this.sms.send({
            to: dto.phone,
            message: dto.message,
        });
        return {
            success: result.success,
            provider: result.provider,
            recipients: result.recipients,
            details: result.details,
            summary: result.summary ?? null,
            error: result.error ?? null,
        };
    }
};
exports.SmsConfigAdminController = SmsConfigAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get current SMS gateway configuration' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SmsConfigAdminController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Patch)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update SMS gateway credentials and settings' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_sms_config_dto_1.UpdateSmsConfigDto]),
    __metadata("design:returntype", Promise)
], SmsConfigAdminController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Enable SMS sending' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmsConfigAdminController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)('deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Disable SMS sending (falls back to console log)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmsConfigAdminController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)('refresh-cache'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Force-reload SMS config from database into memory cache' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmsConfigAdminController.prototype, "refreshCache", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Paginated list of sent SMS messages' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SmsConfigAdminController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SMS_CONFIG_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Send a test SMS to verify the gateway is working' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_sms_dto_1.TestSmsDto]),
    __metadata("design:returntype", Promise)
], SmsConfigAdminController.prototype, "testSms", null);
exports.SmsConfigAdminController = SmsConfigAdminController = __decorate([
    (0, swagger_1.ApiTags)('System — SMS Config'),
    (0, common_1.Controller)('admin/system/sms-config'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [sms_config_service_1.SmsConfigService,
        sms_service_1.SmsService])
], SmsConfigAdminController);
//# sourceMappingURL=sms-config-admin.controller.js.map
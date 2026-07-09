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
exports.NotificationSettingsAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../../common/types/permissions.enum");
const notification_settings_service_1 = require("./notification-settings.service");
const update_notification_settings_dto_1 = require("./dto/update-notification-settings.dto");
let NotificationSettingsAdminController = class NotificationSettingsAdminController {
    constructor(service) {
        this.service = service;
    }
    getAll() {
        return this.service.getAll();
    }
    async updateMany(dto) {
        await this.service.updateMany(dto.updates);
        return { message: 'Notification settings updated successfully.' };
    }
    async refreshCache() {
        await this.service.refreshCache();
        return { message: 'Notification settings cache refreshed.' };
    }
};
exports.NotificationSettingsAdminController = NotificationSettingsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.NOTIFICATION_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List all notification events and their channel preferences' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationSettingsAdminController.prototype, "getAll", null);
__decorate([
    (0, common_1.Patch)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.NOTIFICATION_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk-update notification channel preferences' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_notification_settings_dto_1.UpdateNotificationSettingsDto]),
    __metadata("design:returntype", Promise)
], NotificationSettingsAdminController.prototype, "updateMany", null);
__decorate([
    (0, common_1.Post)('refresh-cache'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.NOTIFICATION_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Force-reload notification settings into memory cache' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationSettingsAdminController.prototype, "refreshCache", null);
exports.NotificationSettingsAdminController = NotificationSettingsAdminController = __decorate([
    (0, swagger_1.ApiTags)('System — Notification Settings'),
    (0, common_1.Controller)('admin/system/notification-settings'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [notification_settings_service_1.NotificationSettingsService])
], NotificationSettingsAdminController);
//# sourceMappingURL=notification-settings-admin.controller.js.map
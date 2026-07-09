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
exports.AiSettingsAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../../common/types/permissions.enum");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const ai_settings_service_1 = require("./ai-settings.service");
const update_ai_settings_dto_1 = require("./dto/update-ai-settings.dto");
let AiSettingsAdminController = class AiSettingsAdminController {
    constructor(aiSettings) {
        this.aiSettings = aiSettings;
    }
    getConfig() {
        return this.aiSettings.getForAdmin();
    }
    async updateConfig(dto, userId) {
        await this.aiSettings.update(dto, userId ?? null);
        return { message: 'AI assistant settings updated successfully.' };
    }
    async activate() {
        await this.aiSettings.setActive(true);
        return { message: 'AI assistant enabled.' };
    }
    async deactivate() {
        await this.aiSettings.setActive(false);
        return { message: 'AI assistant disabled.' };
    }
};
exports.AiSettingsAdminController = AiSettingsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.AI_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get the AI assistant configuration (keys masked)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiSettingsAdminController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Patch)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.AI_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update AI provider keys, default provider, and models' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_ai_settings_dto_1.UpdateAiSettingsDto, String]),
    __metadata("design:returntype", Promise)
], AiSettingsAdminController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.AI_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Enable the public AI assistant' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiSettingsAdminController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)('deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.AI_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Disable the public AI assistant' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiSettingsAdminController.prototype, "deactivate", null);
exports.AiSettingsAdminController = AiSettingsAdminController = __decorate([
    (0, swagger_1.ApiTags)('System — AI Assistant'),
    (0, common_1.Controller)('admin/system/ai-settings'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ai_settings_service_1.AiSettingsService])
], AiSettingsAdminController);
//# sourceMappingURL=ai-settings-admin.controller.js.map
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
exports.UploadSettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const upload_settings_service_1 = require("./upload-settings.service");
const update_upload_settings_dto_1 = require("./dto/update-upload-settings.dto");
const add_mime_type_dto_1 = require("./dto/add-mime-type.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
const public_decorator_1 = require("../common/decorators/public.decorator");
let UploadSettingsController = class UploadSettingsController {
    constructor(service) {
        this.service = service;
    }
    getPublic() {
        return this.service.getSettings();
    }
    get() {
        return this.service.getSettings();
    }
    update(dto) {
        return this.service.updateSettings(dto);
    }
    addMimeType(dto) {
        return this.service.addMimeType(dto.mimeType);
    }
    removeMimeType(mimeType) {
        return this.service.removeMimeType(mimeType);
    }
};
exports.UploadSettingsController = UploadSettingsController;
__decorate([
    (0, common_1.Get)('public'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current upload settings (public — used by file-server)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UploadSettingsController.prototype, "getPublic", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.UPLOAD_SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get upload settings (admin)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UploadSettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.UPLOAD_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update max file size' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_upload_settings_dto_1.UpdateUploadSettingsDto]),
    __metadata("design:returntype", void 0)
], UploadSettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('mime-types'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.UPLOAD_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Add an allowed MIME type' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_mime_type_dto_1.AddMimeTypeDto]),
    __metadata("design:returntype", void 0)
], UploadSettingsController.prototype, "addMimeType", null);
__decorate([
    (0, common_1.Delete)('mime-types/:mimeType'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.UPLOAD_SETTINGS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Remove an allowed MIME type' }),
    (0, swagger_1.ApiParam)({ name: 'mimeType', description: 'URL-encoded MIME type', example: 'application%2Fzip' }),
    __param(0, (0, common_1.Param)('mimeType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UploadSettingsController.prototype, "removeMimeType", null);
exports.UploadSettingsController = UploadSettingsController = __decorate([
    (0, swagger_1.ApiTags)('Upload Settings'),
    (0, common_1.Controller)('upload-settings'),
    __metadata("design:paramtypes", [upload_settings_service_1.UploadSettingsService])
], UploadSettingsController);
//# sourceMappingURL=upload-settings.controller.js.map
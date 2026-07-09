"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const upload_settings_entity_1 = require("./entities/upload-settings.entity");
const upload_settings_service_1 = require("./upload-settings.service");
const upload_settings_controller_1 = require("./upload-settings.controller");
let UploadSettingsModule = class UploadSettingsModule {
};
exports.UploadSettingsModule = UploadSettingsModule;
exports.UploadSettingsModule = UploadSettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([upload_settings_entity_1.UploadSettings])],
        providers: [upload_settings_service_1.UploadSettingsService],
        controllers: [upload_settings_controller_1.UploadSettingsController],
        exports: [upload_settings_service_1.UploadSettingsService],
    })
], UploadSettingsModule);
//# sourceMappingURL=upload-settings.module.js.map
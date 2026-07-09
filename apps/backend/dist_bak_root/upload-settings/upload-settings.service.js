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
exports.UploadSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const upload_settings_entity_1 = require("./entities/upload-settings.entity");
let UploadSettingsService = class UploadSettingsService {
    constructor(repo) {
        this.repo = repo;
    }
    async getSettings() {
        const existing = await this.repo.findOne({ where: {} });
        if (existing)
            return existing;
        const defaults = this.repo.create({ maxFileSize: 524288000, allowedMimeTypes: [] });
        return this.repo.save(defaults);
    }
    async updateSettings(dto) {
        const settings = await this.getSettings();
        if (dto.maxFileSize !== undefined)
            settings.maxFileSize = dto.maxFileSize;
        return this.repo.save(settings);
    }
    async addMimeType(mimeType) {
        const settings = await this.getSettings();
        const normalized = mimeType.toLowerCase().trim();
        if (settings.allowedMimeTypes.includes(normalized)) {
            throw new common_1.ConflictException(`MIME type "${normalized}" is already in the list`);
        }
        settings.allowedMimeTypes = [...settings.allowedMimeTypes, normalized];
        return this.repo.save(settings);
    }
    async removeMimeType(mimeType) {
        const settings = await this.getSettings();
        const normalized = decodeURIComponent(mimeType).toLowerCase().trim();
        if (!settings.allowedMimeTypes.includes(normalized)) {
            throw new common_1.NotFoundException(`MIME type "${normalized}" not found in the list`);
        }
        settings.allowedMimeTypes = settings.allowedMimeTypes.filter((m) => m !== normalized);
        return this.repo.save(settings);
    }
};
exports.UploadSettingsService = UploadSettingsService;
exports.UploadSettingsService = UploadSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(upload_settings_entity_1.UploadSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UploadSettingsService);
//# sourceMappingURL=upload-settings.service.js.map
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
var AiSettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const ai_settings_entity_1 = require("./entities/ai-settings.entity");
const ai_crypto_util_1 = require("./ai-crypto.util");
const KEEP = '_KEEP_';
let AiSettingsService = AiSettingsService_1 = class AiSettingsService {
    constructor(repo, appConfig) {
        this.repo = repo;
        this.appConfig = appConfig;
        this.logger = new common_1.Logger(AiSettingsService_1.name);
        this.cached = null;
        this.cacheLoaded = false;
    }
    async onModuleInit() {
        await this.refreshCache();
    }
    async getActiveConfig() {
        if (this.cacheLoaded)
            return this.cached;
        await this.refreshCache();
        return this.cached;
    }
    async getForAdmin() {
        const row = await this.findRow();
        return {
            defaultProvider: row.defaultProvider ?? 'gemini',
            openaiModel: row.openaiModel,
            geminiModel: row.geminiModel,
            isActive: row.isActive,
            openaiKeySet: !!row.openaiKeyEnc,
            geminiKeySet: !!row.geminiKeyEnc,
            openaiKeyHint: this.keyHint(row.openaiKeyEnc),
            geminiKeyHint: this.keyHint(row.geminiKeyEnc),
        };
    }
    async update(dto, updatedBy) {
        const row = await this.findRow();
        const encKey = this.encryptionKey();
        if (dto.defaultProvider)
            row.defaultProvider = dto.defaultProvider;
        if (dto.openaiModel !== undefined)
            row.openaiModel = dto.openaiModel.trim() || row.openaiModel;
        if (dto.geminiModel !== undefined)
            row.geminiModel = dto.geminiModel.trim() || row.geminiModel;
        if (dto.isActive !== undefined)
            row.isActive = dto.isActive;
        row.openaiKeyEnc = this.resolveKeyUpdate(dto.openaiKey, row.openaiKeyEnc, encKey);
        row.geminiKeyEnc = this.resolveKeyUpdate(dto.geminiKey, row.geminiKeyEnc, encKey);
        row.updatedBy = updatedBy;
        await this.repo.save(row);
        this.invalidateCache();
        this.logger.log(`AI settings updated — provider=${row.defaultProvider}, active=${row.isActive}, ` +
            `openaiKeySet=${!!row.openaiKeyEnc}, geminiKeySet=${!!row.geminiKeyEnc}`);
    }
    async setActive(active) {
        const row = await this.findRow();
        row.isActive = active;
        await this.repo.save(row);
        this.invalidateCache();
    }
    async refreshCache() {
        this.cacheLoaded = true;
        try {
            const row = await this.repo.findOne({ where: {} });
            if (!row || !row.isActive) {
                this.cached = null;
                return;
            }
            const provider = row.defaultProvider ?? 'gemini';
            const enc = provider === 'openai' ? row.openaiKeyEnc : row.geminiKeyEnc;
            const model = provider === 'openai' ? row.openaiModel : row.geminiModel;
            if (!enc) {
                this.logger.warn(`AI assistant active but no API key set for provider "${provider}".`);
                this.cached = null;
                return;
            }
            let apiKey;
            try {
                apiKey = (0, ai_crypto_util_1.decryptSecret)(enc, this.encryptionKey());
            }
            catch {
                this.logger.error('Failed to decrypt AI API key — check APP_ENCRYPTION_KEY. Assistant disabled.');
                this.cached = null;
                return;
            }
            this.cached = { provider, apiKey, model };
        }
        catch (err) {
            this.logger.warn(`AI settings cache refresh failed: ${err}`);
            this.cached = null;
        }
    }
    invalidateCache() {
        this.cached = null;
        this.cacheLoaded = false;
    }
    resolveKeyUpdate(incoming, current, encKey) {
        if (incoming === undefined || incoming === KEEP)
            return current;
        if (incoming === '')
            return '';
        return (0, ai_crypto_util_1.encryptSecret)(incoming.trim(), encKey);
    }
    keyHint(enc) {
        if (!enc)
            return '';
        try {
            const plain = (0, ai_crypto_util_1.decryptSecret)(enc, this.encryptionKey());
            return plain ? `••••${plain.slice(-4)}` : '';
        }
        catch {
            return '••••';
        }
    }
    async findRow() {
        const row = await this.repo.findOne({ where: {} });
        if (!row)
            throw new common_1.NotFoundException('AI settings record not found in database.');
        return row;
    }
    encryptionKey() {
        const key = this.appConfig.get('APP_ENCRYPTION_KEY') ||
            this.appConfig.get('JWT_ACCESS_SECRET') ||
            'rmc-fallback-key-change-in-prod';
        if (key === 'rmc-fallback-key-change-in-prod') {
            this.logger.warn('APP_ENCRYPTION_KEY is not set. Using fallback key — set it in production!');
        }
        return key;
    }
};
exports.AiSettingsService = AiSettingsService;
exports.AiSettingsService = AiSettingsService = AiSettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ai_settings_entity_1.AiSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], AiSettingsService);
//# sourceMappingURL=ai-settings.service.js.map
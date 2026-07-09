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
var SmsConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsConfigService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const sms_config_entity_1 = require("./entities/sms-config.entity");
const sms_message_entity_1 = require("./entities/sms-message.entity");
const sms_crypto_util_1 = require("./sms-crypto.util");
const DLR_PATH = '/api/v1/webhooks/sms-delivery';
let SmsConfigService = SmsConfigService_1 = class SmsConfigService {
    constructor(repo, historyRepo, appConfig) {
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.appConfig = appConfig;
        this.logger = new common_1.Logger(SmsConfigService_1.name);
        this.cachedConfig = null;
    }
    async onModuleInit() {
        await this.refreshCache();
    }
    async getActiveConfig() {
        if (this.cachedConfig)
            return this.cachedConfig;
        await this.refreshCache();
        return this.cachedConfig;
    }
    async getForAdmin() {
        const row = await this.findRow();
        const { passwordEnc, ...rest } = row;
        let password = '';
        if (passwordEnc) {
            try {
                password = (0, sms_crypto_util_1.decryptCredential)(passwordEnc, this.encryptionKey());
            }
            catch {
                this.logger.warn('Could not decrypt SMS password for admin display.');
            }
        }
        return {
            ...rest,
            dlrUrl: rest.dlrUrl || this.defaultDlrUrl(),
            passwordSet: !!passwordEnc,
            password,
        };
    }
    async update(dto) {
        const row = await this.findRow();
        const encKey = this.encryptionKey();
        row.username = dto.username.trim();
        if (dto.password && dto.password !== '_KEEP_') {
            row.passwordEnc = (0, sms_crypto_util_1.encryptCredential)(dto.password, encKey);
        }
        row.senderName = this.sanitizeSender(dto.senderName ?? row.senderName);
        row.dlrUrl = dto.dlrUrl?.trim() || null;
        if (dto.isActive !== undefined)
            row.isActive = dto.isActive;
        await this.repo.save(row);
        this.invalidateCache();
        this.logger.log(`SMS config updated — username="${row.username}", active=${row.isActive}`);
    }
    async setActive(active) {
        const row = await this.findRow();
        row.isActive = active;
        await this.repo.save(row);
        this.invalidateCache();
    }
    async updateBalance(balanceRwf) {
        await this.repo
            .createQueryBuilder()
            .update()
            .set({ balanceRwf, balanceUpdatedAt: new Date() })
            .where('1 = 1')
            .execute();
    }
    async refreshCache() {
        try {
            const row = await this.repo.findOne({ where: { isActive: true } });
            if (!row || !row.username || !row.passwordEnc) {
                this.cachedConfig = null;
                return;
            }
            const encKey = this.encryptionKey();
            let password;
            try {
                password = (0, sms_crypto_util_1.decryptCredential)(row.passwordEnc, encKey);
            }
            catch {
                this.logger.error('Failed to decrypt SMS password — check APP_ENCRYPTION_KEY. SMS will be disabled.');
                this.cachedConfig = null;
                return;
            }
            this.cachedConfig = {
                username: row.username,
                password,
                senderName: row.senderName,
                dlrUrl: row.dlrUrl || this.defaultDlrUrl(),
                isActive: row.isActive,
            };
        }
        catch (err) {
            this.logger.warn(`SMS config cache refresh failed: ${err}`);
            this.cachedConfig = null;
        }
    }
    invalidateCache() {
        this.cachedConfig = null;
    }
    async getHistory(page, limit) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const skip = (safePage - 1) * safeLimit;
        const [items, total] = await this.historyRepo.findAndCount({
            order: { createdAt: 'DESC' },
            skip,
            take: safeLimit,
        });
        return {
            data: items,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }
    async findRow() {
        const row = await this.repo.findOne({ where: {} });
        if (!row)
            throw new common_1.NotFoundException('SMS configuration record not found in database.');
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
    sanitizeSender(sender) {
        return sender.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 11).trim() || 'RMC';
    }
    defaultDlrUrl() {
        const appUrl = (this.appConfig.get('APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
        return `${appUrl}${DLR_PATH}`;
    }
};
exports.SmsConfigService = SmsConfigService;
exports.SmsConfigService = SmsConfigService = SmsConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sms_config_entity_1.SmsConfig)),
    __param(1, (0, typeorm_1.InjectRepository)(sms_message_entity_1.SmsMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], SmsConfigService);
//# sourceMappingURL=sms-config.service.js.map
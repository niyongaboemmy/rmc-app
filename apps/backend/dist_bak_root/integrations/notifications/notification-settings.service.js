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
var NotificationSettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_setting_entity_1 = require("./entities/notification-setting.entity");
let NotificationSettingsService = NotificationSettingsService_1 = class NotificationSettingsService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(NotificationSettingsService_1.name);
        this.cache = new Map();
    }
    async onModuleInit() {
        await this.refreshCache();
    }
    isEmailEnabled(eventKey) {
        const row = this.cache.get(eventKey);
        return row ? row.emailApplicable && row.emailEnabled : true;
    }
    isSmsEnabled(eventKey) {
        const row = this.cache.get(eventKey);
        return row ? row.smsApplicable && row.smsEnabled : true;
    }
    isChannelEnabled(eventKey, channel) {
        return channel === 'email'
            ? this.isEmailEnabled(eventKey)
            : this.isSmsEnabled(eventKey);
    }
    async getAll() {
        return this.repo.find({ order: { groupName: 'ASC', label: 'ASC' } });
    }
    async updateOne(eventKey, patch) {
        const row = await this.repo.findOne({ where: { eventKey } });
        if (!row)
            throw new common_1.NotFoundException(`Unknown notification event: ${eventKey}`);
        if (patch.emailEnabled !== undefined && row.emailApplicable) {
            row.emailEnabled = patch.emailEnabled;
        }
        if (patch.smsEnabled !== undefined && row.smsApplicable) {
            row.smsEnabled = patch.smsEnabled;
        }
        const saved = await this.repo.save(row);
        this.cache.set(eventKey, saved);
        this.logger.log(`Notification setting updated — ${eventKey}: email=${saved.emailEnabled}, sms=${saved.smsEnabled}`);
        return saved;
    }
    async updateMany(updates) {
        for (const u of updates) {
            await this.updateOne(u.eventKey, u);
        }
    }
    async refreshCache() {
        try {
            const rows = await this.repo.find();
            this.cache.clear();
            for (const row of rows) {
                this.cache.set(row.eventKey, row);
            }
            this.logger.debug(`Notification settings cache loaded (${rows.length} events)`);
        }
        catch (err) {
            this.logger.warn(`Failed to load notification settings cache: ${err}`);
        }
    }
};
exports.NotificationSettingsService = NotificationSettingsService;
exports.NotificationSettingsService = NotificationSettingsService = NotificationSettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_setting_entity_1.NotificationSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationSettingsService);
//# sourceMappingURL=notification-settings.service.js.map
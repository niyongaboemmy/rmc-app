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
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const site_content_entity_1 = require("./entities/site-content.entity");
const history_entry_entity_1 = require("./entities/history-entry.entity");
let ContentService = class ContentService {
    constructor(repo, historyRepo) {
        this.repo = repo;
        this.historyRepo = historyRepo;
    }
    async getByKey(sectionKey) {
        const row = await this.repo.findOne({ where: { sectionKey } });
        return row ? row.value : null;
    }
    async getAll() {
        const rows = await this.repo.find();
        return rows.reduce((acc, row) => {
            acc[row.sectionKey] = row.value;
            return acc;
        }, {});
    }
    async upsert(sectionKey, value, updatedBy) {
        const existing = await this.repo.findOne({ where: { sectionKey } });
        if (existing) {
            existing.value = value;
            existing.updatedBy = updatedBy;
            await this.repo.save(existing);
            return existing.value;
        }
        const created = this.repo.create({ sectionKey, value, updatedBy });
        await this.repo.save(created);
        return created.value;
    }
    getHistoryEntries() {
        return this.historyRepo.find({ order: { year: 'ASC', sortOrder: 'ASC' } });
    }
    createHistoryEntry(dto) {
        const entry = this.historyRepo.create(dto);
        return this.historyRepo.save(entry);
    }
    async updateHistoryEntry(id, dto) {
        const entry = await this.historyRepo.findOne({ where: { id } });
        if (!entry)
            throw new common_1.NotFoundException('History entry not found');
        Object.assign(entry, dto);
        return this.historyRepo.save(entry);
    }
    async deleteHistoryEntry(id) {
        const entry = await this.historyRepo.findOne({ where: { id } });
        if (!entry)
            throw new common_1.NotFoundException('History entry not found');
        await this.historyRepo.remove(entry);
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(site_content_entity_1.SiteContent)),
    __param(1, (0, typeorm_1.InjectRepository)(history_entry_entity_1.HistoryEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ContentService);
//# sourceMappingURL=content.service.js.map
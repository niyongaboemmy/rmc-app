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
exports.ContactMessagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contact_message_entity_1 = require("./entities/contact-message.entity");
let ContactMessagesService = class ContactMessagesService {
    constructor(messages) {
        this.messages = messages;
    }
    async create(dto) {
        const message = this.messages.create({
            name: dto.name.trim(),
            email: dto.email.trim(),
            subject: dto.subject.trim(),
            message: dto.message.trim(),
            status: contact_message_entity_1.ContactMessageStatus.UNREAD,
        });
        const saved = await this.messages.save(message);
        return { id: saved.id };
    }
    applyFilters(qb, filters) {
        if (filters.status && filters.status !== 'all') {
            qb.andWhere('msg.status = :status', { status: filters.status });
        }
        if (filters.search) {
            qb.andWhere('(msg.name ILIKE :s OR msg.email ILIKE :s OR msg.subject ILIKE :s OR msg.message ILIKE :s)', { s: `%${filters.search}%` });
        }
        return qb;
    }
    async adminFindAll(filters) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
        const qb = this.messages
            .createQueryBuilder('msg')
            .orderBy('msg.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        this.applyFilters(qb, filters);
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async adminCounts() {
        const rows = await this.messages
            .createQueryBuilder('msg')
            .select('msg.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('msg.status')
            .getRawMany();
        const byStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));
        const unread = byStatus.get(contact_message_entity_1.ContactMessageStatus.UNREAD) ?? 0;
        const read = byStatus.get(contact_message_entity_1.ContactMessageStatus.READ) ?? 0;
        const archived = byStatus.get(contact_message_entity_1.ContactMessageStatus.ARCHIVED) ?? 0;
        return { all: unread + read + archived, unread, read, archived };
    }
    async adminUpdate(id, dto) {
        const message = await this.messages.findOne({ where: { id } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        if (dto.status !== undefined)
            message.status = dto.status;
        return this.messages.save(message);
    }
    async adminRemove(id) {
        const message = await this.messages.findOne({ where: { id } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        await this.messages.remove(message);
        return { id };
    }
};
exports.ContactMessagesService = ContactMessagesService;
exports.ContactMessagesService = ContactMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contact_message_entity_1.ContactMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ContactMessagesService);
//# sourceMappingURL=contact-messages.service.js.map
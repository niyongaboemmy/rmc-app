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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Announcement = void 0;
const typeorm_1 = require("typeorm");
let Announcement = class Announcement {
};
exports.Announcement = Announcement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Announcement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Announcement.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Announcement.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title_i18n', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Announcement.prototype, "titleI18n", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_i18n', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Announcement.prototype, "contentI18n", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'normal' }),
    __metadata("design:type", String)
], Announcement.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_audience', type: 'varchar', length: 20, default: 'all' }),
    __metadata("design:type", String)
], Announcement.prototype, "targetAudience", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Announcement.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'publish_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Announcement.prototype, "publishAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Announcement.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_published', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Announcement.prototype, "isPublished", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'announcement' }),
    __metadata("design:type", String)
], Announcement.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, default: () => "'[]'" }),
    __metadata("design:type", Array)
], Announcement.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'broadcast_sent', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Announcement.prototype, "broadcastSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid' }),
    __metadata("design:type", String)
], Announcement.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Announcement.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Announcement.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Announcement.prototype, "deletedAt", void 0);
exports.Announcement = Announcement = __decorate([
    (0, typeorm_1.Entity)('announcements')
], Announcement);
//# sourceMappingURL=announcement.entity.js.map
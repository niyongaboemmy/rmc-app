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
exports.DriveShare = exports.DriveItem = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let DriveItem = class DriveItem {
};
exports.DriveItem = DriveItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DriveItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], DriveItem.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], DriveItem.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'storage_key', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "storageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_drive_items_parent_id'),
    (0, typeorm_1.Column)({ name: 'parent_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => DriveItem, (item) => item.children, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_id' }),
    __metadata("design:type", Object)
], DriveItem.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => DriveItem, (item) => item.parent),
    __metadata("design:type", Array)
], DriveItem.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_drive_items_owner_id'),
    (0, typeorm_1.Column)({ name: 'owner_id', type: 'uuid' }),
    __metadata("design:type", String)
], DriveItem.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false, eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", user_entity_1.User)
], DriveItem.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_trashed', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DriveItem.prototype, "isTrashed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trashed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "trashedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_starred', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DriveItem.prototype, "isStarred", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 7, nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => DriveShare, (share) => share.item),
    __metadata("design:type", Array)
], DriveItem.prototype, "shares", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriveItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriveItem.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DriveItem.prototype, "deletedAt", void 0);
exports.DriveItem = DriveItem = __decorate([
    (0, typeorm_1.Entity)('drive_items')
], DriveItem);
let DriveShare = class DriveShare {
};
exports.DriveShare = DriveShare;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DriveShare.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_drive_shares_item_id'),
    (0, typeorm_1.Column)({ name: 'item_id', type: 'uuid' }),
    __metadata("design:type", String)
], DriveShare.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => DriveItem, (item) => item.shares, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'item_id' }),
    __metadata("design:type", DriveItem)
], DriveShare.prototype, "item", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_drive_shares_shared_with_id'),
    (0, typeorm_1.Column)({ name: 'shared_with_id', type: 'uuid' }),
    __metadata("design:type", String)
], DriveShare.prototype, "sharedWithId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'shared_with_id' }),
    __metadata("design:type", user_entity_1.User)
], DriveShare.prototype, "sharedWith", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shared_by_id', type: 'uuid' }),
    __metadata("design:type", String)
], DriveShare.prototype, "sharedById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'shared_by_id' }),
    __metadata("design:type", user_entity_1.User)
], DriveShare.prototype, "sharedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'viewer' }),
    __metadata("design:type", String)
], DriveShare.prototype, "permission", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriveShare.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriveShare.prototype, "updatedAt", void 0);
exports.DriveShare = DriveShare = __decorate([
    (0, typeorm_1.Entity)('drive_shares')
], DriveShare);
//# sourceMappingURL=drive-item.entity.js.map
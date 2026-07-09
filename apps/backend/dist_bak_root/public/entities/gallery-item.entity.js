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
exports.GalleryItem = void 0;
const typeorm_1 = require("typeorm");
let GalleryItem = class GalleryItem {
};
exports.GalleryItem = GalleryItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GalleryItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], GalleryItem.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], GalleryItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_key', type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], GalleryItem.prototype, "fileKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'thumbnail_key', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], GalleryItem.prototype, "thumbnailKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'medium_key', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], GalleryItem.prototype, "mediumKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_type', type: 'varchar', length: 20, default: 'image' }),
    __metadata("design:type", String)
], GalleryItem.prototype, "fileType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], GalleryItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', type: 'uuid' }),
    __metadata("design:type", String)
], GalleryItem.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_public', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], GalleryItem.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GalleryItem.prototype, "createdAt", void 0);
exports.GalleryItem = GalleryItem = __decorate([
    (0, typeorm_1.Entity)('gallery_items')
], GalleryItem);
//# sourceMappingURL=gallery-item.entity.js.map
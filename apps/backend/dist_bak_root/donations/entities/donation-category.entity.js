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
exports.DonationCategory = void 0;
const typeorm_1 = require("typeorm");
const donation_subfund_entity_1 = require("./donation-subfund.entity");
let DonationCategory = class DonationCategory {
};
exports.DonationCategory = DonationCategory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DonationCategory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 40 }),
    __metadata("design:type", String)
], DonationCategory.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40, default: 'HandHeart' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'green' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "tone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], DonationCategory.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title_en', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "titleEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title_rw', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "titleRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title_ar', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "titleAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'desc_en', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "descEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'desc_rw', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "descRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'desc_ar', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "descAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_en', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "longEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_rw', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "longRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_ar', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "longAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_en', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "impactEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_rw', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "impactRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_ar', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "impactAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], DonationCategory.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], DonationCategory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => donation_subfund_entity_1.DonationSubFund, (sf) => sf.category),
    __metadata("design:type", Array)
], DonationCategory.prototype, "subfunds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationCategory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationCategory.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DonationCategory.prototype, "deletedAt", void 0);
exports.DonationCategory = DonationCategory = __decorate([
    (0, typeorm_1.Entity)('donation_categories')
], DonationCategory);
//# sourceMappingURL=donation-category.entity.js.map
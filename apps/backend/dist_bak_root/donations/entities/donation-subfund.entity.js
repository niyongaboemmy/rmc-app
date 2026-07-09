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
exports.DonationSubFund = void 0;
const typeorm_1 = require("typeorm");
const donation_category_entity_1 = require("./donation-category.entity");
let DonationSubFund = class DonationSubFund {
};
exports.DonationSubFund = DonationSubFund;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DonationSubFund.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'category_id', type: 'uuid' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => donation_category_entity_1.DonationCategory, (c) => c.subfunds, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", donation_category_entity_1.DonationCategory)
], DonationSubFund.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40 }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], DonationSubFund.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'campaign_slug', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], DonationSubFund.prototype, "campaignSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'label_en', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "labelEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'label_rw', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "labelRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'label_ar', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "labelAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_en', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "longEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_rw', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "longRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'long_ar', type: 'text', default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "longAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_en', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "impactEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_rw', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "impactRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'impact_ar', type: 'varchar', length: 300, default: '' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "impactAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'examples_en', type: 'jsonb', default: () => "'[]'" }),
    __metadata("design:type", Array)
], DonationSubFund.prototype, "examplesEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'examples_rw', type: 'jsonb', default: () => "'[]'" }),
    __metadata("design:type", Array)
], DonationSubFund.prototype, "examplesRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'examples_ar', type: 'jsonb', default: () => "'[]'" }),
    __metadata("design:type", Array)
], DonationSubFund.prototype, "examplesAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], DonationSubFund.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], DonationSubFund.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationSubFund.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationSubFund.prototype, "updatedAt", void 0);
exports.DonationSubFund = DonationSubFund = __decorate([
    (0, typeorm_1.Entity)('donation_subfunds')
], DonationSubFund);
//# sourceMappingURL=donation-subfund.entity.js.map
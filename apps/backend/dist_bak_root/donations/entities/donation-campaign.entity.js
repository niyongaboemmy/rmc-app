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
exports.DonationCampaign = exports.CampaignStatus = void 0;
const typeorm_1 = require("typeorm");
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus["ACTIVE"] = "active";
    CampaignStatus["PAUSED"] = "paused";
    CampaignStatus["CLOSED"] = "closed";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
let DonationCampaign = class DonationCampaign {
};
exports.DonationCampaign = DonationCampaign;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DonationCampaign.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donation_campaigns_slug'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, unique: true }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_amount', type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], DonationCampaign.prototype, "targetAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raised_amount', type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DonationCampaign.prototype, "raisedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'RWF' }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donation_campaigns_fund_type'),
    (0, typeorm_1.Column)({ name: 'fund_type', type: 'varchar', length: 20, default: 'general' }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "fundType", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_campaigns_sub_fund_id'),
    (0, typeorm_1.Column)({ name: 'sub_fund_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], DonationCampaign.prototype, "subFundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_date', type: 'date' }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], DonationCampaign.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hero_image_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], DonationCampaign.prototype, "heroImageUrl", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donation_campaigns_status'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: CampaignStatus.ACTIVE }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid' }),
    __metadata("design:type", String)
], DonationCampaign.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationCampaign.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DonationCampaign.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], DonationCampaign.prototype, "deletedAt", void 0);
exports.DonationCampaign = DonationCampaign = __decorate([
    (0, typeorm_1.Entity)('donation_campaigns')
], DonationCampaign);
//# sourceMappingURL=donation-campaign.entity.js.map
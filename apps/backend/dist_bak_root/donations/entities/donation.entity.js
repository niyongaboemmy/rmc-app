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
exports.Donation = exports.DonationFrequency = exports.DonationStatus = void 0;
const typeorm_1 = require("typeorm");
const donation_campaign_entity_1 = require("./donation-campaign.entity");
var DonationStatus;
(function (DonationStatus) {
    DonationStatus["PENDING"] = "pending";
    DonationStatus["COMPLETED"] = "completed";
    DonationStatus["FAILED"] = "failed";
    DonationStatus["REFUNDED"] = "refunded";
})(DonationStatus || (exports.DonationStatus = DonationStatus = {}));
var DonationFrequency;
(function (DonationFrequency) {
    DonationFrequency["ONCE"] = "once";
    DonationFrequency["MONTHLY"] = "monthly";
    DonationFrequency["YEARLY"] = "yearly";
})(DonationFrequency || (exports.DonationFrequency = DonationFrequency = {}));
let Donation = class Donation {
};
exports.Donation = Donation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Donation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_campaign_id'),
    (0, typeorm_1.Column)({ name: 'campaign_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => donation_campaign_entity_1.DonationCampaign, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'campaign_id' }),
    __metadata("design:type", Object)
], Donation.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_donor_id'),
    (0, typeorm_1.Column)({ name: 'donor_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "donorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'donor_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "donorName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'donor_email', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "donorEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_anonymous', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Donation.prototype, "isAnonymous", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Donation.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'RWF' }),
    __metadata("design:type", String)
], Donation.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_frequency'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: DonationFrequency.ONCE }),
    __metadata("design:type", String)
], Donation.prototype, "frequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'donor_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "donorPhone", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_payment_reference'),
    (0, typeorm_1.Column)({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "paymentReference", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_status'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: DonationStatus.PENDING }),
    __metadata("design:type", String)
], Donation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_charge_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "nextChargeDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Donation.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Donation.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_donations_donated_at'),
    (0, typeorm_1.Column)({ name: 'donated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Donation.prototype, "donatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Donation.prototype, "createdAt", void 0);
exports.Donation = Donation = __decorate([
    (0, typeorm_1.Entity)('donations')
], Donation);
//# sourceMappingURL=donation.entity.js.map
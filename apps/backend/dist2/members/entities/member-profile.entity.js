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
exports.MemberProfile = exports.MemberStatus = exports.ApprovalStatus = exports.MemberCategory = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
var MemberCategory;
(function (MemberCategory) {
    MemberCategory["STANDARD"] = "standard";
    MemberCategory["STUDENT"] = "student";
    MemberCategory["SCHOLAR"] = "scholar";
    MemberCategory["PARTNER"] = "partner";
    MemberCategory["VIP"] = "vip";
})(MemberCategory || (exports.MemberCategory = MemberCategory = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var MemberStatus;
(function (MemberStatus) {
    MemberStatus["ACTIVE"] = "active";
    MemberStatus["INACTIVE"] = "inactive";
    MemberStatus["SUSPENDED"] = "suspended";
    MemberStatus["DECEASED"] = "deceased";
})(MemberStatus || (exports.MemberStatus = MemberStatus = {}));
let MemberProfile = class MemberProfile {
};
exports.MemberProfile = MemberProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MemberProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', unique: true }),
    __metadata("design:type", String)
], MemberProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], MemberProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'membership_number', type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], MemberProfile.prototype, "membershipNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'joined_date', type: 'date' }),
    __metadata("design:type", Date)
], MemberProfile.prototype, "joinedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "occupation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'education_level', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "educationLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_contact_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "emergencyContactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_contact_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "emergencyContactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_given', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MemberProfile.prototype, "consentGiven", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_date', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "consentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'national_id', type: 'varchar', length: 16, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "nationalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: MemberCategory.STANDARD }),
    __metadata("design:type", String)
], MemberProfile.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mosque_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "mosqueId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'province_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "provinceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'district_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "districtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sector_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "sectorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_key', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "photoKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approval_status', type: 'varchar', length: 20, default: ApprovalStatus.PENDING }),
    __metadata("design:type", String)
], MemberProfile.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'member_status', type: 'varchar', length: 20, default: MemberStatus.ACTIVE }),
    __metadata("design:type", String)
], MemberProfile.prototype, "memberStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "statusReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_changed_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "statusChangedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_changed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MemberProfile.prototype, "statusChangedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MemberProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MemberProfile.prototype, "updatedAt", void 0);
exports.MemberProfile = MemberProfile = __decorate([
    (0, typeorm_1.Entity)('member_profiles')
], MemberProfile);
//# sourceMappingURL=member-profile.entity.js.map
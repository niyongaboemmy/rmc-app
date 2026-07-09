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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("../../roles/entities/role.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_national_id'),
    (0, typeorm_1.Column)({ name: 'national_id', type: 'varchar', length: 16, unique: true, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "nationalId", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_email'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_phone'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_of_birth', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'profile_photo_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "profilePhotoUrl", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_role'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'user' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_status'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'member_category', type: 'varchar', length: 20, default: 'standard' }),
    __metadata("design:type", String)
], User.prototype, "memberCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_email_verified', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_phone_verified', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isPhoneVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mfa_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "mfaEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mfa_secret', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "mfaSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'two_factor_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "twoFactorEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_role_id'),
    (0, typeorm_1.Column)({ name: 'role_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.Role, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'role_id' }),
    __metadata("design:type", Object)
], User.prototype, "roleEntity", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_mosque_id'),
    (0, typeorm_1.Column)({ name: 'mosque_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "mosqueId", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_users_area_id'),
    (0, typeorm_1.Column)({ name: 'area_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "areaId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'digital_id_number', type: 'varchar', length: 20, unique: true, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "digitalIdNumber", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deletedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map
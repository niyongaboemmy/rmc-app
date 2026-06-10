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
exports.PhoneOtpVerification = void 0;
const typeorm_1 = require("typeorm");
let PhoneOtpVerification = class PhoneOtpVerification {
};
exports.PhoneOtpVerification = PhoneOtpVerification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PhoneOtpVerification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_phone_otp_verifications_user_id'),
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], PhoneOtpVerification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_phone_otp_verifications_phone'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], PhoneOtpVerification.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'otp_hash', type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], PhoneOtpVerification.prototype, "otpHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PhoneOtpVerification.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PhoneOtpVerification.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PhoneOtpVerification.prototype, "attempts", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PhoneOtpVerification.prototype, "createdAt", void 0);
exports.PhoneOtpVerification = PhoneOtpVerification = __decorate([
    (0, typeorm_1.Entity)('phone_otp_verifications')
], PhoneOtpVerification);
//# sourceMappingURL=phone-otp-verification.entity.js.map
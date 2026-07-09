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
exports.SmsConfig = void 0;
const typeorm_1 = require("typeorm");
let SmsConfig = class SmsConfig {
};
exports.SmsConfig = SmsConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SmsConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], SmsConfig.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_enc', type: 'text' }),
    __metadata("design:type", String)
], SmsConfig.prototype, "passwordEnc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_name', type: 'varchar', length: 11, default: 'RMC' }),
    __metadata("design:type", String)
], SmsConfig.prototype, "senderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dlr_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], SmsConfig.prototype, "dlrUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SmsConfig.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance_rwf', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], SmsConfig.prototype, "balanceRwf", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance_updated_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SmsConfig.prototype, "balanceUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SmsConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SmsConfig.prototype, "updatedAt", void 0);
exports.SmsConfig = SmsConfig = __decorate([
    (0, typeorm_1.Entity)('sms_config')
], SmsConfig);
//# sourceMappingURL=sms-config.entity.js.map
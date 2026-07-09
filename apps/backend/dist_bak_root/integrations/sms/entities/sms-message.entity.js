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
exports.SmsMessage = void 0;
const typeorm_1 = require("typeorm");
let SmsMessage = class SmsMessage {
};
exports.SmsMessage = SmsMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SmsMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true }),
    __metadata("design:type", Array)
], SmsMessage.prototype, "recipients", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SmsMessage.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'intouch' }),
    __metadata("design:type", String)
], SmsMessage.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SmsMessage.prototype, "success", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_messages', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "totalMessages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "cost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], SmsMessage.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], SmsMessage.prototype, "createdAt", void 0);
exports.SmsMessage = SmsMessage = __decorate([
    (0, typeorm_1.Entity)('sms_messages')
], SmsMessage);
//# sourceMappingURL=sms-message.entity.js.map
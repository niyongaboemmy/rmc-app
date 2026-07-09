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
exports.PaymentTypeRate = void 0;
const typeorm_1 = require("typeorm");
const payment_type_entity_1 = require("./payment-type.entity");
let PaymentTypeRate = class PaymentTypeRate {
};
exports.PaymentTypeRate = PaymentTypeRate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentTypeRate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_type_id', type: 'uuid' }),
    __metadata("design:type", String)
], PaymentTypeRate.prototype, "paymentTypeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_type_entity_1.PaymentType, (pt) => pt.rates, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'payment_type_id' }),
    __metadata("design:type", payment_type_entity_1.PaymentType)
], PaymentTypeRate.prototype, "paymentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PaymentTypeRate.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], PaymentTypeRate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentTypeRate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], PaymentTypeRate.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentTypeRate.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PaymentTypeRate.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentTypeRate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentTypeRate.prototype, "updatedAt", void 0);
exports.PaymentTypeRate = PaymentTypeRate = __decorate([
    (0, typeorm_1.Entity)('payment_type_rates')
], PaymentTypeRate);
//# sourceMappingURL=payment-type-rate.entity.js.map
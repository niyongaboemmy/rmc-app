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
exports.PaymentType = exports.PaymentTypeKey = void 0;
const typeorm_1 = require("typeorm");
const payment_type_rate_entity_1 = require("./payment-type-rate.entity");
var PaymentTypeKey;
(function (PaymentTypeKey) {
    PaymentTypeKey["DONATION"] = "DONATION";
    PaymentTypeKey["MARRIAGE_FEE"] = "MARRIAGE_FEE";
    PaymentTypeKey["MEMBERSHIP_FEE"] = "MEMBERSHIP_FEE";
    PaymentTypeKey["SCHOOL_FEE"] = "SCHOOL_FEE";
    PaymentTypeKey["EVENT_FEE"] = "EVENT_FEE";
    PaymentTypeKey["ZAKAT"] = "ZAKAT";
})(PaymentTypeKey || (exports.PaymentTypeKey = PaymentTypeKey = {}));
let PaymentType = class PaymentType {
};
exports.PaymentType = PaymentType;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentType.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PaymentType.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], PaymentType.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentType.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], PaymentType.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentType.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_type_rate_entity_1.PaymentTypeRate, (r) => r.paymentType, { cascade: true, eager: false }),
    __metadata("design:type", Array)
], PaymentType.prototype, "rates", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentType.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentType.prototype, "updatedAt", void 0);
exports.PaymentType = PaymentType = __decorate([
    (0, typeorm_1.Entity)('payment_types')
], PaymentType);
//# sourceMappingURL=payment-type.entity.js.map
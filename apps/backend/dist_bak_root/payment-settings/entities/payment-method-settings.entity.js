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
exports.PaymentMethodSettings = void 0;
const typeorm_1 = require("typeorm");
const payment_method_entity_1 = require("./payment-method.entity");
let PaymentMethodSettings = class PaymentMethodSettings {
};
exports.PaymentMethodSettings = PaymentMethodSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentMethodSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method_id', type: 'uuid', unique: true }),
    __metadata("design:type", String)
], PaymentMethodSettings.prototype, "paymentMethodId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payment_method_entity_1.PaymentMethod, { onDelete: 'CASCADE', eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'payment_method_id' }),
    __metadata("design:type", payment_method_entity_1.PaymentMethod)
], PaymentMethodSettings.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], PaymentMethodSettings.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_test_mode', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PaymentMethodSettings.prototype, "isTestMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_configured', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentMethodSettings.prototype, "isConfigured", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentMethodSettings.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentMethodSettings.prototype, "updatedAt", void 0);
exports.PaymentMethodSettings = PaymentMethodSettings = __decorate([
    (0, typeorm_1.Entity)('payment_method_settings')
], PaymentMethodSettings);
//# sourceMappingURL=payment-method-settings.entity.js.map
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
exports.PaymentTransaction = exports.PaymentTransactionStatus = void 0;
const typeorm_1 = require("typeorm");
var PaymentTransactionStatus;
(function (PaymentTransactionStatus) {
    PaymentTransactionStatus["PENDING"] = "pending";
    PaymentTransactionStatus["SUCCESSFUL"] = "successful";
    PaymentTransactionStatus["FAILED"] = "failed";
    PaymentTransactionStatus["CANCELLED"] = "cancelled";
})(PaymentTransactionStatus || (exports.PaymentTransactionStatus = PaymentTransactionStatus = {}));
let PaymentTransaction = class PaymentTransaction {
};
exports.PaymentTransaction = PaymentTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_ptx_request_txn_id'),
    (0, typeorm_1.Column)({ name: 'request_transaction_id', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "requestTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_transaction_id', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "gatewayTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method_code', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "paymentMethodCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_type_key', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "paymentTypeKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PaymentTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'RWF' }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mobile_phone', type: 'varchar', length: 30 }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "mobilePhone", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_ptx_status'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: PaymentTransactionStatus.PENDING }),
    __metadata("design:type", String)
], PaymentTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'response_code', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "responseCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'callback_payload', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "callbackPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_test', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentTransaction.prototype, "isTest", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initiated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "initiatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PaymentTransaction.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PaymentTransaction.prototype, "updatedAt", void 0);
exports.PaymentTransaction = PaymentTransaction = __decorate([
    (0, typeorm_1.Entity)('payment_transactions')
], PaymentTransaction);
//# sourceMappingURL=payment-transaction.entity.js.map
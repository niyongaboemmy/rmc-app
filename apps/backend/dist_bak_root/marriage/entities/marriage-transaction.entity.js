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
exports.MarriageTransaction = void 0;
const typeorm_1 = require("typeorm");
const marriage_application_entity_1 = require("./marriage-application.entity");
let MarriageTransaction = class MarriageTransaction {
};
exports.MarriageTransaction = MarriageTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MarriageTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'application_id', type: 'uuid' }),
    __metadata("design:type", String)
], MarriageTransaction.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => marriage_application_entity_1.MarriageApplication, (app) => app.transactions),
    (0, typeorm_1.JoinColumn)({ name: 'application_id' }),
    __metadata("design:type", marriage_application_entity_1.MarriageApplication)
], MarriageTransaction.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], MarriageTransaction.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_ref', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], MarriageTransaction.prototype, "providerRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], MarriageTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'RWF' }),
    __metadata("design:type", String)
], MarriageTransaction.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], MarriageTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'initiated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MarriageTransaction.prototype, "initiatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], MarriageTransaction.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MarriageTransaction.prototype, "confirmedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], MarriageTransaction.prototype, "metadata", void 0);
exports.MarriageTransaction = MarriageTransaction = __decorate([
    (0, typeorm_1.Entity)('marriage_transactions')
], MarriageTransaction);
//# sourceMappingURL=marriage-transaction.entity.js.map
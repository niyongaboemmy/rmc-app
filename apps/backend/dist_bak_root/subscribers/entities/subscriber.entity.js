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
exports.Subscriber = void 0;
const typeorm_1 = require("typeorm");
let Subscriber = class Subscriber {
};
exports.Subscriber = Subscriber;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subscriber.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_subscribers_email', { unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Subscriber.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Subscriber.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 5, default: 'en' }),
    __metadata("design:type", String)
], Subscriber.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40, nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_subscribers_unsub_token', { unique: true }),
    (0, typeorm_1.Column)({ name: 'unsubscribe_token', type: 'uuid' }),
    __metadata("design:type", String)
], Subscriber.prototype, "unsubscribeToken", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Subscriber.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Subscriber.prototype, "updatedAt", void 0);
exports.Subscriber = Subscriber = __decorate([
    (0, typeorm_1.Entity)('subscribers')
], Subscriber);
//# sourceMappingURL=subscriber.entity.js.map
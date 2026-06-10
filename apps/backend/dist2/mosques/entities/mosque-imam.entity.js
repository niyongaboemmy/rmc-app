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
exports.MosqueImam = void 0;
const typeorm_1 = require("typeorm");
const mosque_entity_1 = require("./mosque.entity");
let MosqueImam = class MosqueImam {
};
exports.MosqueImam = MosqueImam;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MosqueImam.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mosque_id', type: 'uuid' }),
    __metadata("design:type", String)
], MosqueImam.prototype, "mosqueId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => mosque_entity_1.Mosque),
    (0, typeorm_1.JoinColumn)({ name: 'mosque_id' }),
    __metadata("design:type", mosque_entity_1.Mosque)
], MosqueImam.prototype, "mosque", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], MosqueImam.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_primary', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MosqueImam.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_date', type: 'date' }),
    __metadata("design:type", Date)
], MosqueImam.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], MosqueImam.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], MosqueImam.prototype, "createdAt", void 0);
exports.MosqueImam = MosqueImam = __decorate([
    (0, typeorm_1.Entity)('mosque_imams')
], MosqueImam);
//# sourceMappingURL=mosque-imam.entity.js.map
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
exports.HistoryEntry = void 0;
const typeorm_1 = require("typeorm");
let HistoryEntry = class HistoryEntry {
};
exports.HistoryEntry = HistoryEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HistoryEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], HistoryEntry.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "titleEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "titleRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "titleAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "descriptionEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "descriptionRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], HistoryEntry.prototype, "descriptionAr", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], HistoryEntry.prototype, "imageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], HistoryEntry.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HistoryEntry.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], HistoryEntry.prototype, "updatedAt", void 0);
exports.HistoryEntry = HistoryEntry = __decorate([
    (0, typeorm_1.Entity)('history_entries')
], HistoryEntry);
//# sourceMappingURL=history-entry.entity.js.map
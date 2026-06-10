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
exports.VerseOfDay = void 0;
const typeorm_1 = require("typeorm");
let VerseOfDay = class VerseOfDay {
};
exports.VerseOfDay = VerseOfDay;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VerseOfDay.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], VerseOfDay.prototype, "surah", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], VerseOfDay.prototype, "ayah", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'arabic_text', type: 'text' }),
    __metadata("design:type", String)
], VerseOfDay.prototype, "arabicText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'translation_en', type: 'text' }),
    __metadata("design:type", String)
], VerseOfDay.prototype, "translationEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'translation_rw', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], VerseOfDay.prototype, "translationRw", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], VerseOfDay.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_date', type: 'date', unique: true }),
    __metadata("design:type", Date)
], VerseOfDay.prototype, "displayDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], VerseOfDay.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], VerseOfDay.prototype, "createdAt", void 0);
exports.VerseOfDay = VerseOfDay = __decorate([
    (0, typeorm_1.Entity)('verses_of_day')
], VerseOfDay);
//# sourceMappingURL=verse-of-day.entity.js.map
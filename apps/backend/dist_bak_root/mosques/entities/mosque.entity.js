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
exports.Mosque = void 0;
const typeorm_1 = require("typeorm");
let Mosque = class Mosque {
};
exports.Mosque = Mosque;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Mosque.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Mosque.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_mosque_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "parentMosqueId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Mosque, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_mosque_id' }),
    __metadata("design:type", Object)
], Mosque.prototype, "parentMosque", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gps_lat', type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "gpsLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gps_lng', type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "gpsLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'province_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "provinceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'district_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "districtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sector_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "sectorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'founding_year', type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "foundingYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'friday_prayer_time', type: 'time', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "fridayPrayerTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imam_name', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "imamName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imam_phone', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "imamPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imam_photo', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Mosque.prototype, "imamPhoto", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], Mosque.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Mosque.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Mosque.prototype, "updatedAt", void 0);
exports.Mosque = Mosque = __decorate([
    (0, typeorm_1.Entity)('mosques')
], Mosque);
//# sourceMappingURL=mosque.entity.js.map
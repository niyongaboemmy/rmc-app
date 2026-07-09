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
exports.School = exports.SchoolStatus = exports.SchoolLevel = void 0;
const typeorm_1 = require("typeorm");
var SchoolLevel;
(function (SchoolLevel) {
    SchoolLevel["PRIMARY"] = "primary";
    SchoolLevel["SECONDARY"] = "secondary";
    SchoolLevel["MADRASSA"] = "madrassa";
    SchoolLevel["TVET"] = "tvet";
})(SchoolLevel || (exports.SchoolLevel = SchoolLevel = {}));
var SchoolStatus;
(function (SchoolStatus) {
    SchoolStatus["ACTIVE"] = "active";
    SchoolStatus["INACTIVE"] = "inactive";
})(SchoolStatus || (exports.SchoolStatus = SchoolStatus = {}));
let School = class School {
};
exports.School = School;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], School.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], School.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_schools_level'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: SchoolLevel.PRIMARY }),
    __metadata("design:type", String)
], School.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'principal_name', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "principalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_schools_province_code'),
    (0, typeorm_1.Column)({ name: 'province_code', type: 'varchar', length: 8, nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "provinceCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gps_lat', type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "gpsLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gps_lng', type: 'double precision', nullable: true }),
    __metadata("design:type", Object)
], School.prototype, "gpsLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: SchoolStatus.ACTIVE }),
    __metadata("design:type", String)
], School.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], School.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], School.prototype, "updatedAt", void 0);
exports.School = School = __decorate([
    (0, typeorm_1.Entity)('schools')
], School);
//# sourceMappingURL=school.entity.js.map
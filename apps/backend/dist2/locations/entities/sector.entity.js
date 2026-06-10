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
exports.Sector = void 0;
const typeorm_1 = require("typeorm");
const district_entity_1 = require("./district.entity");
let Sector = class Sector {
};
exports.Sector = Sector;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Sector.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Sector.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'district_id', type: 'uuid' }),
    __metadata("design:type", String)
], Sector.prototype, "districtId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => district_entity_1.District, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'district_id' }),
    __metadata("design:type", district_entity_1.District)
], Sector.prototype, "district", void 0);
exports.Sector = Sector = __decorate([
    (0, typeorm_1.Entity)('sectors')
], Sector);
//# sourceMappingURL=sector.entity.js.map
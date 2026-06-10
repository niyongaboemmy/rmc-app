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
exports.Area = void 0;
const typeorm_1 = require("typeorm");
const sector_entity_1 = require("./sector.entity");
const district_entity_1 = require("./district.entity");
let Area = class Area {
};
exports.Area = Area;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Area.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Area.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sector_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Area.prototype, "sectorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'district_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Area.prototype, "districtId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sector_entity_1.Sector, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'sector_id' }),
    __metadata("design:type", Object)
], Area.prototype, "sector", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => district_entity_1.District, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'district_id' }),
    __metadata("design:type", Object)
], Area.prototype, "district", void 0);
exports.Area = Area = __decorate([
    (0, typeorm_1.Entity)('areas')
], Area);
//# sourceMappingURL=area.entity.js.map
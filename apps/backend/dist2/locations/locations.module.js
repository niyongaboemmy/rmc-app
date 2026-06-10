"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const province_entity_1 = require("./entities/province.entity");
const district_entity_1 = require("./entities/district.entity");
const sector_entity_1 = require("./entities/sector.entity");
const area_entity_1 = require("./entities/area.entity");
const locations_service_1 = require("./locations.service");
const locations_controller_1 = require("./locations.controller");
let LocationsModule = class LocationsModule {
};
exports.LocationsModule = LocationsModule;
exports.LocationsModule = LocationsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([province_entity_1.Province, district_entity_1.District, sector_entity_1.Sector, area_entity_1.Area])],
        providers: [locations_service_1.LocationsService],
        controllers: [locations_controller_1.LocationsController],
        exports: [locations_service_1.LocationsService, typeorm_1.TypeOrmModule],
    })
], LocationsModule);
//# sourceMappingURL=locations.module.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const province_entity_1 = require("./entities/province.entity");
const district_entity_1 = require("./entities/district.entity");
const sector_entity_1 = require("./entities/sector.entity");
const area_entity_1 = require("./entities/area.entity");
let LocationsService = class LocationsService {
    constructor(provinces, districts, sectors, areas) {
        this.provinces = provinces;
        this.districts = districts;
        this.sectors = sectors;
        this.areas = areas;
    }
    findAllProvinces() {
        return this.provinces.find({ order: { name: 'ASC' } });
    }
    findAllDistricts(provinceId) {
        const where = provinceId ? { provinceId } : {};
        return this.districts.find({ where, order: { name: 'ASC' } });
    }
    findAllSectors(districtId) {
        const where = districtId ? { districtId } : {};
        return this.sectors.find({ where, order: { name: 'ASC' } });
    }
    findAllAreas(districtId) {
        const where = districtId ? { districtId } : {};
        return this.areas.find({ where, order: { name: 'ASC' } });
    }
    async findProvinceById(id) {
        const province = await this.provinces.findOne({ where: { id } });
        if (!province)
            throw new common_1.NotFoundException('Province not found');
        return province;
    }
    async findDistrictById(id) {
        const district = await this.districts.findOne({ where: { id } });
        if (!district)
            throw new common_1.NotFoundException('District not found');
        return district;
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(province_entity_1.Province)),
    __param(1, (0, typeorm_1.InjectRepository)(district_entity_1.District)),
    __param(2, (0, typeorm_1.InjectRepository)(sector_entity_1.Sector)),
    __param(3, (0, typeorm_1.InjectRepository)(area_entity_1.Area)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LocationsService);
//# sourceMappingURL=locations.service.js.map
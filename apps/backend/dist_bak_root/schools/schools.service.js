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
exports.SchoolsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const school_entity_1 = require("./entities/school.entity");
let SchoolsService = class SchoolsService {
    constructor(schools) {
        this.schools = schools;
    }
    listPublic() {
        return this.schools.find({
            where: { status: school_entity_1.SchoolStatus.ACTIVE },
            order: { name: 'ASC' },
        });
    }
    adminList() {
        return this.schools.find({ order: { name: 'ASC' } });
    }
    create(dto) {
        const school = this.schools.create({
            ...dto,
            status: dto.status ?? school_entity_1.SchoolStatus.ACTIVE,
        });
        return this.schools.save(school);
    }
    async update(id, dto) {
        const school = await this.schools.findOne({ where: { id } });
        if (!school)
            throw new common_1.NotFoundException('School not found');
        Object.assign(school, dto);
        return this.schools.save(school);
    }
    async remove(id) {
        const school = await this.schools.findOne({ where: { id } });
        if (!school)
            throw new common_1.NotFoundException('School not found');
        await this.schools.remove(school);
        return { id };
    }
};
exports.SchoolsService = SchoolsService;
exports.SchoolsService = SchoolsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(school_entity_1.School)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SchoolsService);
//# sourceMappingURL=schools.service.js.map
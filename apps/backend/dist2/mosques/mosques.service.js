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
exports.MosquesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mosque_entity_1 = require("./entities/mosque.entity");
const mosque_imam_entity_1 = require("./entities/mosque-imam.entity");
let MosquesService = class MosquesService {
    constructor(mosques, imams) {
        this.mosques = mosques;
        this.imams = imams;
    }
    async create(dto) {
        if (dto.parentMosqueId) {
            const parent = await this.mosques.findOne({ where: { id: dto.parentMosqueId } });
            if (!parent)
                throw new common_1.BadRequestException('Parent mosque not found');
        }
        const mosque = this.mosques.create(dto);
        return this.mosques.save(mosque);
    }
    findAll(districtId, status) {
        const where = {};
        if (districtId)
            where['districtId'] = districtId;
        if (status)
            where['status'] = status;
        return this.mosques.find({ where, order: { name: 'ASC' } });
    }
    findRootMosques() {
        return this.mosques.find({
            where: { parentMosqueId: (0, typeorm_2.IsNull)(), status: 'active' },
            order: { name: 'ASC' },
        });
    }
    async findBranches(parentId) {
        await this.findById(parentId);
        return this.mosques.find({ where: { parentMosqueId: parentId }, order: { name: 'ASC' } });
    }
    async findById(id) {
        const mosque = await this.mosques.findOne({ where: { id } });
        if (!mosque)
            throw new common_1.NotFoundException('Mosque not found');
        return mosque;
    }
    async update(id, dto) {
        const mosque = await this.findById(id);
        Object.assign(mosque, dto);
        return this.mosques.save(mosque);
    }
    async remove(id) {
        const mosque = await this.findById(id);
        mosque.status = 'inactive';
        await this.mosques.save(mosque);
    }
    async assignImam(mosqueId, dto) {
        await this.findById(mosqueId);
        if (dto.isPrimary) {
            await this.imams.update({ mosqueId, isPrimary: true }, { isPrimary: false });
        }
        const imam = this.imams.create({ mosqueId, ...dto });
        return this.imams.save(imam);
    }
    getImams(mosqueId) {
        return this.imams.find({ where: { mosqueId }, order: { startDate: 'DESC' } });
    }
    getStatistics() {
        return this.mosques.count({ where: { status: 'active' } });
    }
};
exports.MosquesService = MosquesService;
exports.MosquesService = MosquesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(mosque_entity_1.Mosque)),
    __param(1, (0, typeorm_1.InjectRepository)(mosque_imam_entity_1.MosqueImam)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MosquesService);
//# sourceMappingURL=mosques.service.js.map
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
exports.MosquesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mosques_service_1 = require("./mosques.service");
const create_mosque_dto_1 = require("./dto/create-mosque.dto");
const assign_imam_dto_1 = require("./dto/assign-imam.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let MosquesController = class MosquesController {
    constructor(mosques) {
        this.mosques = mosques;
    }
    findAll(districtId, status) {
        return this.mosques.findAll(districtId, status);
    }
    findRoots() {
        return this.mosques.findRootMosques();
    }
    findOne(id) {
        return this.mosques.findById(id);
    }
    getBranches(id) {
        return this.mosques.findBranches(id);
    }
    getImams(id) {
        return this.mosques.getImams(id);
    }
    create(dto) {
        return this.mosques.create(dto);
    }
    update(id, dto) {
        return this.mosques.update(id, dto);
    }
    remove(id) {
        return this.mosques.remove(id);
    }
    assignImam(id, dto) {
        return this.mosques.assignImam(id, dto);
    }
};
exports.MosquesController = MosquesController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all mosques' }),
    (0, swagger_1.ApiQuery)({ name: 'districtId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('districtId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('roots'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get root (parent) mosques only' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "findRoots", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get mosque by id' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/branches'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get branch mosques of a parent mosque' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "getBranches", null);
__decorate([
    (0, common_1.Get)(':id/imams'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MOSQUES_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get imams assigned to a mosque' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "getImams", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MOSQUES_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a mosque' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mosque_dto_1.CreateMosqueDto]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MOSQUES_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Update a mosque' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_mosque_dto_1.CreateMosqueDto]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MOSQUES_DELETE),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a mosque' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/imams'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MOSQUES_MANAGE_IMAMS),
    (0, swagger_1.ApiOperation)({ summary: 'Assign an imam to a mosque' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_imam_dto_1.AssignImamDto]),
    __metadata("design:returntype", void 0)
], MosquesController.prototype, "assignImam", null);
exports.MosquesController = MosquesController = __decorate([
    (0, swagger_1.ApiTags)('Mosques'),
    (0, common_1.Controller)('mosques'),
    __metadata("design:paramtypes", [mosques_service_1.MosquesService])
], MosquesController);
//# sourceMappingURL=mosques.controller.js.map
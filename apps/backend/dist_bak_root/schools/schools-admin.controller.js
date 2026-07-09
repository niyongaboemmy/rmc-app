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
exports.SchoolsAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schools_service_1 = require("./schools.service");
const create_school_dto_1 = require("./dto/create-school.dto");
const update_school_dto_1 = require("./dto/update-school.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let SchoolsAdminController = class SchoolsAdminController {
    constructor(service) {
        this.service = service;
    }
    list() {
        return this.service.adminList();
    }
    create(dto) {
        return this.service.create(dto);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.SchoolsAdminController = SchoolsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SCHOOLS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List all schools (any status)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchoolsAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SCHOOLS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a school' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_school_dto_1.CreateSchoolDto]),
    __metadata("design:returntype", void 0)
], SchoolsAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SCHOOLS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a school' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_school_dto_1.UpdateSchoolDto]),
    __metadata("design:returntype", void 0)
], SchoolsAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SCHOOLS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a school' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchoolsAdminController.prototype, "remove", null);
exports.SchoolsAdminController = SchoolsAdminController = __decorate([
    (0, swagger_1.ApiTags)('Schools — Admin'),
    (0, common_1.Controller)('admin/schools'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [schools_service_1.SchoolsService])
], SchoolsAdminController);
//# sourceMappingURL=schools-admin.controller.js.map
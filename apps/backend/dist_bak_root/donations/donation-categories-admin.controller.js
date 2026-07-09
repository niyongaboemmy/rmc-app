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
exports.DonationCategoriesAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const donation_categories_service_1 = require("./donation-categories.service");
const category_content_dto_1 = require("./dto/category-content.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let DonationCategoriesAdminController = class DonationCategoriesAdminController {
    constructor(service) {
        this.service = service;
    }
    list() {
        return this.service.adminList();
    }
    listDeleted() {
        return this.service.adminListDeletedCategories();
    }
    createCategory(dto) {
        return this.service.createCategory(dto);
    }
    updateCategory(id, dto) {
        return this.service.updateCategory(id, dto);
    }
    deleteCategory(id) {
        return this.service.deleteCategory(id);
    }
    restoreCategory(id) {
        return this.service.restoreCategory(id);
    }
    createSubFund(categoryId, dto) {
        return this.service.createSubFund(categoryId, dto);
    }
    updateSubFund(subId, dto) {
        return this.service.updateSubFund(subId, dto);
    }
    deleteSubFund(subId) {
        return this.service.deleteSubFund(subId);
    }
};
exports.DonationCategoriesAdminController = DonationCategoriesAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List donation categories + sub-funds (full multilingual)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('deleted'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List archived (soft-deleted) donation categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "listDeleted", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a donation category' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [category_content_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a donation category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, category_content_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Archive (soft-delete) a donation category (sub-funds preserved)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Restore an archived (soft-deleted) donation category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "restoreCategory", null);
__decorate([
    (0, common_1.Post)(':categoryId/subfunds'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a sub-fund under a category' }),
    __param(0, (0, common_1.Param)('categoryId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, category_content_dto_1.CreateSubFundDto]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "createSubFund", null);
__decorate([
    (0, common_1.Patch)('subfunds/:subId'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a sub-fund' }),
    __param(0, (0, common_1.Param)('subId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, category_content_dto_1.UpdateSubFundDto]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "updateSubFund", null);
__decorate([
    (0, common_1.Delete)('subfunds/:subId'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a sub-fund' }),
    __param(0, (0, common_1.Param)('subId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationCategoriesAdminController.prototype, "deleteSubFund", null);
exports.DonationCategoriesAdminController = DonationCategoriesAdminController = __decorate([
    (0, swagger_1.ApiTags)('Donations — Admin'),
    (0, common_1.Controller)('admin/donations/categories'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [donation_categories_service_1.DonationCategoriesService])
], DonationCategoriesAdminController);
//# sourceMappingURL=donation-categories-admin.controller.js.map
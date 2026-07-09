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
exports.DonationsAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const donations_service_1 = require("./donations.service");
const create_campaign_dto_1 = require("./dto/create-campaign.dto");
const update_campaign_dto_1 = require("./dto/update-campaign.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let DonationsAdminController = class DonationsAdminController {
    constructor(service) {
        this.service = service;
    }
    findAll(dateFrom, dateTo, campaignId, status, search, page, limit, sort, order) {
        return this.service.adminFindAll({
            dateFrom,
            dateTo,
            campaignId,
            status,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            sort,
            order,
        });
    }
    getDaily(days, currency) {
        return this.service.adminGetDailyReceived(days ? parseInt(days, 10) : 30, currency || 'RWF');
    }
    getStats(dateFrom, dateTo, campaignId, status) {
        return this.service.adminGetStats({ dateFrom, dateTo, campaignId, status });
    }
    listCampaigns() {
        return this.service.adminListCampaigns();
    }
    listDeletedCampaigns() {
        return this.service.adminListDeletedCampaigns();
    }
    createCampaign(dto, userId) {
        return this.service.createCampaign(dto, userId);
    }
    updateCampaign(id, dto) {
        return this.service.updateCampaign(id, dto);
    }
    deleteCampaign(id) {
        return this.service.deleteCampaign(id);
    }
    restoreCampaign(id) {
        return this.service.restoreCampaign(id);
    }
};
exports.DonationsAdminController = DonationsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List donations (filter by date range, program, status, search)' }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'campaignId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'sort', required: false, enum: ['date', 'amount', 'donor', 'status'] }),
    (0, swagger_1.ApiQuery)({ name: 'order', required: false, enum: ['ASC', 'DESC'] }),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('campaignId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('sort')),
    __param(8, (0, common_1.Query)('order')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('daily'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Daily completed-donation totals for the dashboard chart' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'currency', required: false }),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "getDaily", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Donation totals + per-program / per-currency breakdowns' }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'campaignId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('campaignId')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('campaigns'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List donation programs with live received totals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Get)('campaigns/deleted'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List archived (soft-deleted) donation programs' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "listDeletedCampaigns", null);
__decorate([
    (0, common_1.Post)('campaigns'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a donation program' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_campaign_dto_1.CreateCampaignDto, String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Patch)('campaigns/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a donation program' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_campaign_dto_1.UpdateCampaignDto]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "updateCampaign", null);
__decorate([
    (0, common_1.Delete)('campaigns/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Archive (soft-delete) a donation program' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "deleteCampaign", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/restore'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.DONATIONS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Restore an archived (soft-deleted) donation program' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationsAdminController.prototype, "restoreCampaign", null);
exports.DonationsAdminController = DonationsAdminController = __decorate([
    (0, swagger_1.ApiTags)('Donations — Admin'),
    (0, common_1.Controller)('admin/donations'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [donations_service_1.DonationsService])
], DonationsAdminController);
//# sourceMappingURL=donations-admin.controller.js.map
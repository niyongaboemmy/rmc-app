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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const members_service_1 = require("./members.service");
const register_member_dto_1 = require("./dto/register-member.dto");
const approve_member_dto_1 = require("./dto/approve-member.dto");
const update_member_status_dto_1 = require("./dto/update-member-status.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let MembersController = class MembersController {
    constructor(members) {
        this.members = members;
    }
    register(user, dto) {
        return this.members.register(user.sub, dto);
    }
    findAll(search, mosqueId, districtId, category, approvalStatus, memberStatus, page, limit) {
        return this.members.findAll({
            search, mosqueId, districtId, category, approvalStatus, memberStatus,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
        });
    }
    getStats() {
        return this.members.getStatistics();
    }
    getWeeklyStats() {
        return this.members.getWeeklyStats();
    }
    getMyProfile(user) {
        return this.members.findByUserId(user.sub);
    }
    findOne(id) {
        return this.members.findById(id);
    }
    approve(id, user, dto) {
        return this.members.approve(id, user.sub, dto);
    }
    updateStatus(id, user, dto) {
        return this.members.updateStatus(id, user.sub, dto);
    }
    async downloadIdCard(id, res) {
        const pdfBuffer = await this.members.generateDigitalIdCard(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="rmc-id-${id}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        res.status(common_1.HttpStatus.OK).end(pdfBuffer);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit member registration profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_member_dto_1.RegisterMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "register", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List members with filtering and pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'mosqueId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'districtId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'approvalStatus', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'memberStatus', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('mosqueId')),
    __param(2, (0, common_1.Query)('districtId')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('approvalStatus')),
    __param(5, (0, common_1.Query)('memberStatus')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get member statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('weekly-stats'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily registration counts for the last 7 days' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getWeeklyStats", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user member profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get member by id' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/approve'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_APPROVE),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject a member registration' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, approve_member_dto_1.ApproveMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "approve", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Update member status (active/inactive/suspended/deceased)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_member_status_dto_1.UpdateMemberStatusDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)(':id/id-card'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MEMBERS_ID_CARD),
    (0, swagger_1.ApiOperation)({ summary: 'Download digital member ID card as PDF' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "downloadIdCard", null);
exports.MembersController = MembersController = __decorate([
    (0, swagger_1.ApiTags)('Members'),
    (0, common_1.Controller)('members'),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map
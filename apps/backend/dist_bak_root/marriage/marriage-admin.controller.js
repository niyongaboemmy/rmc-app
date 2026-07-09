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
exports.MarriageAdminController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const marriage_service_1 = require("./marriage.service");
const update_application_status_dto_1 = require("./dto/update-application-status.dto");
const schedule_ceremony_dto_1 = require("./dto/schedule-ceremony.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
const user_entity_1 = require("../users/entities/user.entity");
class VerifyDocumentDto {
}
__decorate([
    (0, class_validator_2.IsBoolean)(),
    __metadata("design:type", Boolean)
], VerifyDocumentDto.prototype, "verified", void 0);
class InitiateMomoDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateMomoDto.prototype, "mobilePhone", void 0);
class SignedProvisionalDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SignedProvisionalDto.prototype, "fileKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SignedProvisionalDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SignedProvisionalDto.prototype, "fileSize", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SignedProvisionalDto.prototype, "mimeType", void 0);
let MarriageAdminController = class MarriageAdminController {
    constructor(service) {
        this.service = service;
    }
    findAll(status, paymentStatus, venueType, search, dateFrom, dateTo, sort, order, page, limit) {
        return this.service.adminFindAll({
            status,
            paymentStatus,
            venueType,
            search,
            dateFrom,
            dateTo,
            sort,
            order,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    findOne(id) {
        return this.service.adminFindOne(id);
    }
    updateStatus(user, id, dto) {
        return this.service.adminUpdateStatus(id, user.id, dto);
    }
    schedule(user, id, dto) {
        return this.service.adminScheduleCeremony(id, user.id, dto);
    }
    confirmPayment(user, id) {
        return this.service.adminConfirmCashPayment(id, user.id);
    }
    initiateMomo(user, id, dto) {
        return this.service.adminInitiateMomoPayment(id, user.id, dto.mobilePhone);
    }
    checkMomoStatus(id, txId) {
        return this.service.adminGetMomoPaymentStatus(id, txId);
    }
    verifyDocument(user, id, docId, body) {
        return this.service.adminVerifyDocument(id, docId, user.id, body.verified);
    }
    saveWeddingPhoto(user, id, body) {
        return this.service.adminSaveWeddingPhoto(id, user.id, body.photoUrl);
    }
    saveSignedProvisional(user, id, dto) {
        return this.service.adminSaveSignedProvisional(id, user.id, dto);
    }
    issueCertificate(user, id) {
        return this.service.adminIssueCertificate(id, user.id);
    }
    getStats() {
        return this.service.adminGetStats();
    }
};
exports.MarriageAdminController = MarriageAdminController;
__decorate([
    (0, common_1.Get)('applications'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List all marriage applications' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'paymentStatus', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'venueType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sort', required: false, enum: ['date', 'amount', 'couple', 'payment', 'status'] }),
    (0, swagger_1.ApiQuery)({ name: 'order', required: false, enum: ['ASC', 'DESC'] }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('paymentStatus')),
    __param(2, (0, common_1.Query)('venueType')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('dateFrom')),
    __param(5, (0, common_1.Query)('dateTo')),
    __param(6, (0, common_1.Query)('sort')),
    __param(7, (0, common_1.Query)('order')),
    __param(8, (0, common_1.Query)('page')),
    __param(9, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('applications/:id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get full application detail' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('applications/:id/status'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_APPROVE),
    (0, swagger_1.ApiOperation)({ summary: 'Update application status (approve / reject / amendments)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, update_application_status_dto_1.UpdateApplicationStatusDto]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('applications/:id/schedule'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_APPROVE),
    (0, swagger_1.ApiOperation)({ summary: 'Schedule the ceremony date' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, schedule_ceremony_dto_1.ScheduleCeremonyDto]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "schedule", null);
__decorate([
    (0, common_1.Post)('applications/:id/payment/confirm'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm cash or bank payment' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Post)('applications/:id/payment/initiate-momo'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate MoMo payment request via IntouchPay' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, InitiateMomoDto]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "initiateMomo", null);
__decorate([
    (0, common_1.Get)('applications/:id/payment/:txId/status'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Check MoMo payment status from IntouchPay' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('txId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "checkMomoStatus", null);
__decorate([
    (0, common_1.Patch)('applications/:id/documents/:docId/verify'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a submitted document as verified / unverified' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, String, VerifyDocumentDto]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "verifyDocument", null);
__decorate([
    (0, common_1.Post)('applications/:id/wedding-photo'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_APPROVE),
    (0, swagger_1.ApiOperation)({ summary: 'Upload wedding photo after ceremony completion' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, Object]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "saveWeddingPhoto", null);
__decorate([
    (0, common_1.Post)('applications/:id/signed-provisional'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_CERTIFICATE),
    (0, swagger_1.ApiOperation)({ summary: 'Attach the signed provisional certificate (required before issuing)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, SignedProvisionalDto]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "saveSignedProvisional", null);
__decorate([
    (0, common_1.Post)('applications/:id/certificate'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_CERTIFICATE),
    (0, swagger_1.ApiOperation)({ summary: 'Issue marriage certificate' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "issueCertificate", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.MARRIAGE_REPORTS),
    (0, swagger_1.ApiOperation)({ summary: 'Get marriage service statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarriageAdminController.prototype, "getStats", null);
exports.MarriageAdminController = MarriageAdminController = __decorate([
    (0, swagger_1.ApiTags)('Marriage — Admin'),
    (0, common_1.Controller)('admin/marriage'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [marriage_service_1.MarriageService])
], MarriageAdminController);
//# sourceMappingURL=marriage-admin.controller.js.map
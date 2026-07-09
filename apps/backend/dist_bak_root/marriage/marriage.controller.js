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
exports.MarriageController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const marriage_service_1 = require("./marriage.service");
const create_marriage_application_dto_1 = require("./dto/create-marriage-application.dto");
const save_document_dto_1 = require("./dto/save-document.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const public_decorator_1 = require("../common/decorators/public.decorator");
let MarriageController = class MarriageController {
    constructor(service) {
        this.service = service;
    }
    createDraft(user, dto) {
        return this.service.createDraft(user.id, dto);
    }
    updateDraft(user, id, dto) {
        return this.service.updateDraft(id, user.id, dto);
    }
    submit(user, id) {
        return this.service.submit(id, user.id);
    }
    checkPaymentStatus(user, id) {
        return this.service.checkUserMomoPaymentStatus(id, user.id);
    }
    initiateMomoPayment(user, id, dto) {
        return this.service.initiateUserMomoPayment(id, user.id, dto.mobilePhone);
    }
    devCompletePayment(user, id) {
        return this.service.devCompletePayment(id, user.id);
    }
    saveDocument(user, id, dto) {
        return this.service.saveDocument(id, user.id, dto);
    }
    cancel(user, id) {
        return this.service.cancel(id, user.id);
    }
    listMine(user) {
        return this.service.findAllByApplicant(user.id);
    }
    getByNumber(number) {
        return this.service.findByApplicationNumber(number);
    }
    getOne(user, id) {
        return this.service.findOwnApplication(id, user.id);
    }
    getMarriageFees() {
        return this.service.getMarriageFees();
    }
    publicVerify(applicationNumber) {
        return this.service.publicVerify(applicationNumber);
    }
    addParties(user, id, dto) {
        return this.service.addParties(id, user.id, dto.parties);
    }
    getParties(user, id) {
        return this.service.getPartyConfirmations(id);
    }
    async getPartiesByNumber(number) {
        const app = await this.service.findByApplicationNumber(number);
        if (!app)
            return [];
        const parties = await this.service.getPartyConfirmations(app.id);
        return parties.map((p) => ({
            role: p.role,
            confirmedAt: p.confirmedAt,
        }));
    }
    lookupToken(token) {
        return this.service.lookupByToken(token);
    }
    confirmParty(token, dto) {
        return this.service.confirmParty(token, dto.notes);
    }
};
exports.MarriageController = MarriageController;
__decorate([
    (0, common_1.Post)('applications/draft'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a marriage application draft' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, create_marriage_application_dto_1.CreateMarriageApplicationDto]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "createDraft", null);
__decorate([
    (0, common_1.Put)('applications/:id/draft'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a draft application' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, Object]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Post)('applications/:id/submit'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a draft application' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('applications/:id/payment/check'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Poll IntouchPay gateway for payment status and sync DB' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "checkPaymentStatus", null);
__decorate([
    (0, common_1.Post)('applications/:id/payment/initiate-momo'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate MoMo (IntouchPay) payment for a draft application' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, Object]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "initiateMomoPayment", null);
__decorate([
    (0, common_1.Post)('applications/:id/payment/dev-complete'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: '[DEV ONLY] Mark payment as completed without the gateway (blocked in production)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "devCompletePayment", null);
__decorate([
    (0, common_1.Post)('applications/:id/documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Save an uploaded document record for an application' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, save_document_dto_1.SaveDocumentDto]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "saveDocument", null);
__decorate([
    (0, common_1.Post)('applications/:id/cancel'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel an application' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('applications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List own applications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)('applications/by-number/:number'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get application by application number (public)' }),
    __param(0, (0, common_1.Param)('number')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "getByNumber", null);
__decorate([
    (0, common_1.Get)('applications/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get own application by UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)('fees'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current marriage fee tiers (public)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "getMarriageFees", null);
__decorate([
    (0, common_1.Get)('public/verify/:applicationNumber'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Public QR code certificate verification' }),
    __param(0, (0, common_1.Param)('applicationNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "publicVerify", null);
__decorate([
    (0, common_1.Post)('applications/:id/parties'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add party phone numbers to trigger confirmation requests' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, Object]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "addParties", null);
__decorate([
    (0, common_1.Get)('applications/:id/parties'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get confirmation status for all parties' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "getParties", null);
__decorate([
    (0, common_1.Get)('applications/by-number/:number/parties'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get party confirmation status by application number (public — no PII)' }),
    __param(0, (0, common_1.Param)('number')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarriageController.prototype, "getPartiesByNumber", null);
__decorate([
    (0, common_1.Get)('confirm/:token'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Look up a party confirmation request by token' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "lookupToken", null);
__decorate([
    (0, common_1.Post)('confirm/:token'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Submit party confirmation' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MarriageController.prototype, "confirmParty", null);
exports.MarriageController = MarriageController = __decorate([
    (0, swagger_1.ApiTags)('Marriage — Member'),
    (0, common_1.Controller)('marriage'),
    __metadata("design:paramtypes", [marriage_service_1.MarriageService])
], MarriageController);
//# sourceMappingURL=marriage.controller.js.map
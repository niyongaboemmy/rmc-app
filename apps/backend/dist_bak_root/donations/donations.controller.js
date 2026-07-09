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
exports.DonationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const donations_service_1 = require("./donations.service");
const create_donation_dto_1 = require("./dto/create-donation.dto");
let DonationsController = class DonationsController {
    constructor(service) {
        this.service = service;
    }
    listCampaigns() {
        return this.service.listPublicCampaigns();
    }
    create(dto, userId) {
        return this.service.create(dto, userId ?? null);
    }
    checkStatus(id) {
        return this.service.refreshPaymentStatus(id);
    }
};
exports.DonationsController = DonationsController;
__decorate([
    (0, common_1.Get)('campaigns'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List active donation programs for the public donate page' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonationsController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Record a donation made from the public donate page' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_donation_dto_1.CreateDonationDto, Object]),
    __metadata("design:returntype", void 0)
], DonationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Re-check a pending donation against the payment gateway and return its current status',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationsController.prototype, "checkStatus", null);
exports.DonationsController = DonationsController = __decorate([
    (0, swagger_1.ApiTags)('Donations'),
    (0, common_1.Controller)('donations'),
    __metadata("design:paramtypes", [donations_service_1.DonationsService])
], DonationsController);
//# sourceMappingURL=donations.controller.js.map
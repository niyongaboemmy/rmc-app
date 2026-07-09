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
exports.DonationCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const donation_categories_service_1 = require("./donation-categories.service");
let DonationCategoriesController = class DonationCategoriesController {
    constructor(service) {
        this.service = service;
    }
    list(locale) {
        return this.service.listPublic(locale ?? 'en');
    }
};
exports.DonationCategoriesController = DonationCategoriesController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Donation categories + sub-funds for the public donate page (localized)' }),
    (0, swagger_1.ApiQuery)({ name: 'locale', required: false, enum: ['en', 'rw', 'ar'] }),
    __param(0, (0, common_1.Query)('locale')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonationCategoriesController.prototype, "list", null);
exports.DonationCategoriesController = DonationCategoriesController = __decorate([
    (0, swagger_1.ApiTags)('Donations'),
    (0, common_1.Controller)('donations/categories'),
    __metadata("design:paramtypes", [donation_categories_service_1.DonationCategoriesService])
], DonationCategoriesController);
//# sourceMappingURL=donation-categories.controller.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const social_service_1 = require("./social.service");
let SocialController = class SocialController {
    constructor(service) {
        this.service = service;
    }
    getFeed() {
        return this.service.getFeed();
    }
    refresh() {
        return this.service.refresh();
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Get)('feed'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Latest aggregated social-media posts (cached)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Force an immediate refresh of the social feed' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "refresh", null);
exports.SocialController = SocialController = __decorate([
    (0, swagger_1.ApiTags)('Social'),
    (0, common_1.Controller)('social'),
    __metadata("design:paramtypes", [social_service_1.SocialService])
], SocialController);
//# sourceMappingURL=social.controller.js.map
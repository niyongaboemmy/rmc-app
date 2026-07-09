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
exports.SubscribersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const subscribers_service_1 = require("./subscribers.service");
const subscriber_dto_1 = require("./dto/subscriber.dto");
let SubscribersController = class SubscribersController {
    constructor(service) {
        this.service = service;
    }
    subscribe(dto) {
        return this.service.subscribe(dto);
    }
    unsubscribe(dto) {
        return this.service.unsubscribe(dto.token);
    }
};
exports.SubscribersController = SubscribersController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('subscribe'),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe an email to platform updates (single opt-in)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscriber_dto_1.CreateSubscriberDto]),
    __metadata("design:returntype", void 0)
], SubscribersController.prototype, "subscribe", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('unsubscribe'),
    (0, swagger_1.ApiOperation)({ summary: 'Unsubscribe via the token from an email link' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscriber_dto_1.UnsubscribeDto]),
    __metadata("design:returntype", void 0)
], SubscribersController.prototype, "unsubscribe", null);
exports.SubscribersController = SubscribersController = __decorate([
    (0, swagger_1.ApiTags)('Subscribers'),
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [subscribers_service_1.SubscribersService])
], SubscribersController);
//# sourceMappingURL=subscribers.controller.js.map
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
exports.ContactMessagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const contact_messages_service_1 = require("./contact-messages.service");
const create_contact_message_dto_1 = require("./dto/create-contact-message.dto");
let ContactMessagesController = class ContactMessagesController {
    constructor(service) {
        this.service = service;
    }
    create(dto) {
        return this.service.create(dto);
    }
};
exports.ContactMessagesController = ContactMessagesController;
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a message from the public Contact page' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contact_message_dto_1.CreateContactMessageDto]),
    __metadata("design:returntype", void 0)
], ContactMessagesController.prototype, "create", null);
exports.ContactMessagesController = ContactMessagesController = __decorate([
    (0, swagger_1.ApiTags)('Contact Messages'),
    (0, common_1.Controller)('contact-messages'),
    __metadata("design:paramtypes", [contact_messages_service_1.ContactMessagesService])
], ContactMessagesController);
//# sourceMappingURL=contact-messages.controller.js.map
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
exports.ContactMessagesAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contact_messages_service_1 = require("./contact-messages.service");
const update_contact_message_dto_1 = require("./dto/update-contact-message.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let ContactMessagesAdminController = class ContactMessagesAdminController {
    constructor(service) {
        this.service = service;
    }
    findAll(status, search, page, limit) {
        return this.service.adminFindAll({
            status,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    counts() {
        return this.service.adminCounts();
    }
    update(id, dto) {
        return this.service.adminUpdate(id, dto);
    }
    remove(id) {
        return this.service.adminRemove(id);
    }
};
exports.ContactMessagesAdminController = ContactMessagesAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTACT_MESSAGES_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List contact messages (filter by status / search)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ContactMessagesAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTACT_MESSAGES_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Message counts per status (all / unread / read / archived)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContactMessagesAdminController.prototype, "counts", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTACT_MESSAGES_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a message status (read / archived / unread)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_contact_message_dto_1.UpdateContactMessageDto]),
    __metadata("design:returntype", void 0)
], ContactMessagesAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTACT_MESSAGES_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a contact message' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContactMessagesAdminController.prototype, "remove", null);
exports.ContactMessagesAdminController = ContactMessagesAdminController = __decorate([
    (0, swagger_1.ApiTags)('Contact Messages — Admin'),
    (0, common_1.Controller)('admin/contact-messages'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [contact_messages_service_1.ContactMessagesService])
], ContactMessagesAdminController);
//# sourceMappingURL=contact-messages-admin.controller.js.map
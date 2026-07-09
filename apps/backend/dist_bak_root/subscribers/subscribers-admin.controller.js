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
exports.SubscribersAdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const subscribers_service_1 = require("./subscribers.service");
const subscriber_dto_1 = require("./dto/subscriber.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let SubscribersAdminController = class SubscribersAdminController {
    constructor(service) {
        this.service = service;
    }
    list() {
        return this.service.adminList();
    }
    broadcast(dto) {
        return this.service.broadcast(dto);
    }
    broadcastFile(file, body) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('An Excel/CSV file is required.');
        const subject = (body.subject ?? '').trim();
        const html = body.html ?? '';
        if (subject.length < 2)
            throw new common_1.BadRequestException('A subject is required.');
        if (html.replace(/<[^>]*>/g, '').trim().length === 0) {
            throw new common_1.BadRequestException('A message body is required.');
        }
        return this.service.broadcastFromFile(subject, html, file.buffer);
    }
    sendTest(dto) {
        return this.service.sendTest(dto.to);
    }
    remove(id) {
        return this.service.adminRemove(id);
    }
};
exports.SubscribersAdminController = SubscribersAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SUBSCRIBERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List subscribers with totals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SubscribersAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('broadcast'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SUBSCRIBERS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Send a broadcast/newsletter to all active subscribers' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscriber_dto_1.BroadcastDto]),
    __metadata("design:returntype", void 0)
], SubscribersAdminController.prototype, "broadcast", null);
__decorate([
    (0, common_1.Post)('broadcast-file'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SUBSCRIBERS_MANAGE),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk-mail a message to emails uploaded in an Excel/CSV file' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 5 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SubscribersAdminController.prototype, "broadcastFile", null);
__decorate([
    (0, common_1.Post)('test-email'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SUBSCRIBERS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Send a one-off test email to verify SMTP delivery' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscriber_dto_1.TestEmailDto]),
    __metadata("design:returntype", void 0)
], SubscribersAdminController.prototype, "sendTest", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.SUBSCRIBERS_MANAGE),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a subscriber' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SubscribersAdminController.prototype, "remove", null);
exports.SubscribersAdminController = SubscribersAdminController = __decorate([
    (0, swagger_1.ApiTags)('Subscribers — Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('admin/subscribers'),
    __metadata("design:paramtypes", [subscribers_service_1.SubscribersService])
], SubscribersAdminController);
//# sourceMappingURL=subscribers-admin.controller.js.map
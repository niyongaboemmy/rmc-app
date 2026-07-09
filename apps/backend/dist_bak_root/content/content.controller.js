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
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const content_service_1 = require("./content.service");
const update_content_dto_1 = require("./dto/update-content.dto");
let ContentController = class ContentController {
    constructor(service) {
        this.service = service;
    }
    getAll() {
        return this.service.getAll();
    }
    getByKey(key) {
        return this.service.getByKey(key);
    }
    upsert(key, dto, userId) {
        return this.service.upsert(key, dto.value, userId ?? null);
    }
    getHistory() {
        return this.service.getHistoryEntries();
    }
    createHistory(dto) {
        return this.service.createHistoryEntry(dto);
    }
    updateHistory(id, dto) {
        return this.service.updateHistoryEntry(id, dto);
    }
    deleteHistory(id) {
        return this.service.deleteHistoryEntry(id);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all editable site content sections' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single content section by key' }),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getByKey", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTENT_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Create or update a content section' }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_content_dto_1.UpdateContentDto, String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "upsert", null);
__decorate([
    (0, common_1.Get)('history/entries'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all RMC history timeline entries' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('history/entries'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTENT_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a history entry (admin)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "createHistory", null);
__decorate([
    (0, common_1.Put)('history/entries/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTENT_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Update a history entry (admin)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "updateHistory", null);
__decorate([
    (0, common_1.Delete)('history/entries/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.Permissions)(permissions_enum_1.Permission.CONTENT_DELETE),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a history entry (admin)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "deleteHistory", null);
exports.ContentController = ContentController = __decorate([
    (0, swagger_1.ApiTags)('Content'),
    (0, common_1.Controller)('content'),
    __metadata("design:paramtypes", [content_service_1.ContentService])
], ContentController);
//# sourceMappingURL=content.controller.js.map
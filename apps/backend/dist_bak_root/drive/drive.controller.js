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
exports.DriveController = void 0;
const common_1 = require("@nestjs/common");
const archiver = require('archiver');
const https = require("https");
const http = require("http");
const swagger_1 = require("@nestjs/swagger");
const drive_service_1 = require("./drive.service");
const config_1 = require("@nestjs/config");
const create_folder_dto_1 = require("./dto/create-folder.dto");
const add_file_dto_1 = require("./dto/add-file.dto");
const update_item_dto_1 = require("./dto/update-item.dto");
const share_item_dto_1 = require("./dto/share-item.dto");
const move_item_dto_1 = require("./dto/move-item.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const permissions_enum_1 = require("../common/types/permissions.enum");
let DriveController = class DriveController {
    constructor(driveService, config) {
        this.driveService = driveService;
        this.config = config;
        this.fileServerUrl = this.config.get('app.fileServerUrl') || 'http://localhost:3002';
    }
    listItems(req, parentId, trashed) {
        return this.driveService.listItems(req.user.id, parentId, trashed === 'true');
    }
    listSharedWithMe(req) {
        return this.driveService.listSharedWithMe(req.user.id);
    }
    listStarred(req) {
        return this.driveService.listStarred(req.user.id);
    }
    listTrash(req) {
        return this.driveService.listTrashed(req.user.id);
    }
    search(req, q) {
        return this.driveService.search(req.user.id, q);
    }
    stats(req) {
        return this.driveService.getStorageStats(req.user.id);
    }
    searchUsers(req, q) {
        return this.driveService.searchUsers(q, req.user.id);
    }
    adminListAll(parentId) {
        return this.driveService.adminListAll(parentId);
    }
    adminUserFiles(userId) {
        return this.driveService.adminListUserFiles(userId);
    }
    adminSharedWithUser(userId) {
        return this.driveService.adminListSharedWithUser(userId);
    }
    proxyFile(key, res) {
        if (!key)
            return res.status(400).json({ message: 'key is required' });
        const fileUrl = `${this.fileServerUrl}/api/v1/files/${key}`;
        const proto = fileUrl.startsWith('https') ? https : http;
        const req = proto.get(fileUrl, (stream) => {
            if (stream.statusCode && stream.statusCode >= 400) {
                return res.status(stream.statusCode).json({ message: 'File not found' });
            }
            res.set('Content-Type', stream.headers['content-type'] || 'application/octet-stream');
            if (stream.headers['content-length']) {
                res.set('Content-Length', stream.headers['content-length']);
            }
            res.set('Cache-Control', 'private, max-age=3600');
            res.set('Content-Disposition', 'inline');
            stream.pipe(res);
        });
        req.on('error', () => {
            if (!res.headersSent) {
                res.status(502).json({ message: 'File server unavailable' });
            }
        });
    }
    getItem(req, id) {
        return this.driveService.getItem(id, req.user.id);
    }
    getBreadcrumb(req, id) {
        return this.driveService.getBreadcrumb(id, req.user.id);
    }
    listShares(req, id) {
        return this.driveService.listShares(id, req.user.id);
    }
    createFolder(req, dto) {
        return this.driveService.createFolder(req.user.id, dto);
    }
    addFile(req, dto) {
        return this.driveService.addFile(req.user.id, dto);
    }
    updateItem(req, id, dto) {
        return this.driveService.updateItem(id, req.user.id, dto);
    }
    moveItem(req, id, dto) {
        return this.driveService.moveItem(id, req.user.id, dto);
    }
    copyItem(req, id, dto) {
        return this.driveService.copyItem(id, req.user.id, dto.targetFolderId ?? undefined);
    }
    trashItem(req, id) {
        return this.driveService.trashItem(id, req.user.id);
    }
    restoreItem(req, id) {
        return this.driveService.restoreItem(id, req.user.id);
    }
    permanentDelete(req, id) {
        return this.driveService.permanentDelete(id, req.user.id);
    }
    shareItem(req, id, dto) {
        return this.driveService.shareItem(id, req.user.id, dto);
    }
    removeShare(req, id, shareId) {
        return this.driveService.removeShare(id, shareId, req.user.id);
    }
    async downloadZip(req, id, res) {
        const isAdmin = (req.user?.permissions ?? []).includes('drive:admin') ||
            (req.user?.permissions ?? []).includes('*');
        const files = await this.driveService.getDescendantFiles(id, req.user.id, isAdmin);
        const item = await this.driveService.getItem(id, req.user.id, isAdmin);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${item.name}.zip"`);
        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.pipe(res);
        for (const file of files) {
            if (!file.storageKey)
                continue;
            const fileUrl = `${this.fileServerUrl}/api/v1/files/${file.storageKey}`;
            await new Promise((resolve, reject) => {
                const proto = fileUrl.startsWith('https') ? https : http;
                proto.get(fileUrl, (stream) => {
                    archive.append(stream, { name: file.name });
                    stream.on('end', resolve);
                    stream.on('error', reject);
                }).on('error', reject);
            });
        }
        await archive.finalize();
    }
};
exports.DriveController = DriveController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List items in a folder (or root)' }),
    (0, swagger_1.ApiQuery)({ name: 'parentId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'trashed', required: false, type: Boolean }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('parentId')),
    __param(2, (0, common_1.Query)('trashed')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listItems", null);
__decorate([
    (0, common_1.Get)('shared-with-me'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List items shared with the current user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listSharedWithMe", null);
__decorate([
    (0, common_1.Get)('starred'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List starred items' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listStarred", null);
__decorate([
    (0, common_1.Get)('trash'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List trashed items' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listTrash", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Search items by name' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Storage usage stats' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('users/search'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_SHARE),
    (0, swagger_1.ApiOperation)({ summary: 'Search users to share with' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "searchUsers", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: browse all files' }),
    (0, swagger_1.ApiQuery)({ name: 'parentId', required: false }),
    __param(0, (0, common_1.Query)('parentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "adminListAll", null);
__decorate([
    (0, common_1.Get)('admin/user/:userId'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: list all files for a specific user' }),
    (0, swagger_1.ApiParam)({ name: 'userId' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "adminUserFiles", null);
__decorate([
    (0, common_1.Get)('admin/user/:userId/shared-with'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: list items shared with a specific user' }),
    (0, swagger_1.ApiParam)({ name: 'userId' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "adminSharedWithUser", null);
__decorate([
    (0, common_1.Get)('proxy'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Proxy file content from file-server with JWT auth' }),
    (0, swagger_1.ApiQuery)({ name: 'key', required: true }),
    __param(0, (0, common_1.Query)('key')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "proxyFile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single item' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "getItem", null);
__decorate([
    (0, common_1.Get)(':id/breadcrumb'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get folder breadcrumb path' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "getBreadcrumb", null);
__decorate([
    (0, common_1.Get)(':id/shares'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_SHARE),
    (0, swagger_1.ApiOperation)({ summary: 'List shares for an item' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listShares", null);
__decorate([
    (0, common_1.Post)('folders'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new folder' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_folder_dto_1.CreateFolderDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Post)('files'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Register a file after upload to file-server' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_file_dto_1.AddFileDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "addFile", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Rename / update item metadata' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_item_dto_1.UpdateItemDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Post)(':id/move'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_EDIT),
    (0, swagger_1.ApiOperation)({ summary: 'Move item to another folder (or root)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, move_item_dto_1.MoveItemDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "moveItem", null);
__decorate([
    (0, common_1.Post)(':id/copy'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Copy item to another folder (or root)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, move_item_dto_1.MoveItemDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "copyItem", null);
__decorate([
    (0, common_1.Post)(':id/trash'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_DELETE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Move item to trash' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "trashItem", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_DELETE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Restore item from trash' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "restoreItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_DELETE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete item' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "permanentDelete", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_SHARE),
    (0, swagger_1.ApiOperation)({ summary: 'Share item with one or more users' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, share_item_dto_1.ShareItemDto]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "shareItem", null);
__decorate([
    (0, common_1.Delete)(':id/shares/:shareId'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_SHARE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a share from an item' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('shareId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "removeShare", null);
__decorate([
    (0, common_1.Get)(':id/download-zip'),
    (0, permissions_decorator_1.RequirePermissions)(permissions_enum_1.Permission.DRIVE_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Download a folder as a zip archive' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DriveController.prototype, "downloadZip", null);
exports.DriveController = DriveController = __decorate([
    (0, swagger_1.ApiTags)('drive'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('drive'),
    __metadata("design:paramtypes", [drive_service_1.DriveService,
        config_1.ConfigService])
], DriveController);
//# sourceMappingURL=drive.controller.js.map
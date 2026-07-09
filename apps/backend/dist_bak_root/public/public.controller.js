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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_service_1 = require("./public.service");
let PublicController = class PublicController {
    constructor(service) {
        this.service = service;
    }
    getVerse() {
        return this.service.getVerseOfDay();
    }
    createVerse(user, dto) {
        return this.service.createVerse({ ...dto, createdBy: user.sub });
    }
    getAnnouncements(type, limit, includeExpired) {
        return this.service.getActiveAnnouncements(type, limit ? parseInt(limit, 10) : 10, includeExpired === 'true');
    }
    adminGetAllAnnouncements(type, limit) {
        return this.service.adminGetAllAnnouncements(type, limit ? parseInt(limit, 10) : 100);
    }
    getAnnouncementById(id) {
        return this.service.getAnnouncementById(id);
    }
    createAnnouncement(user, dto) {
        return this.service.createAnnouncement({ ...dto, createdBy: user.sub });
    }
    updateAnnouncement(id, dto) {
        return this.service.updateAnnouncement(id, dto);
    }
    deleteAnnouncement(id) {
        return this.service.deleteAnnouncement(id);
    }
    getPosts(category, page) {
        return this.service.getPublishedPosts(category, page ? parseInt(page) : 1);
    }
    getCategories() {
        return this.service.getCategories();
    }
    getPost(slug) {
        return this.service.getPostBySlug(slug);
    }
    createPost(user, dto) {
        return this.service.createPost({ ...dto, authorId: user.sub });
    }
    updatePost(id, dto) {
        return this.service.updatePost(id, dto);
    }
    getGallery(category, page) {
        return this.service.getGallery(category, page ? parseInt(page) : 1);
    }
    adminGetGallery(category, page) {
        return this.service.adminGetGallery(category, page ? parseInt(page) : 1);
    }
    addGalleryItem(userId, dto) {
        return this.service.addGalleryItem({ ...dto, uploadedBy: userId });
    }
    updateGalleryItem(id, dto) {
        return this.service.updateGalleryItem(id, dto);
    }
    deleteGalleryItem(id) {
        return this.service.deleteGalleryItem(id);
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('verse-of-day'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get verse of the day' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getVerse", null);
__decorate([
    (0, common_1.Post)('verse-of-day'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "createVerse", null);
__decorate([
    (0, common_1.Get)('announcements'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get active announcements' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, description: 'Filter by type: announcement | tender' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'includeExpired', required: false, type: Boolean, description: 'Include expired/closed items (default: false)' }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('includeExpired')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getAnnouncements", null);
__decorate([
    (0, common_1.Get)('announcements/admin-all'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all announcements including unpublished (admin)' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "adminGetAllAnnouncements", null);
__decorate([
    (0, common_1.Get)('announcements/:id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single announcement/tender by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getAnnouncementById", null);
__decorate([
    (0, common_1.Post)('announcements'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "createAnnouncement", null);
__decorate([
    (0, common_1.Put)('announcements/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "updateAnnouncement", null);
__decorate([
    (0, common_1.Delete)('announcements/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "deleteAnnouncement", null);
__decorate([
    (0, common_1.Get)('blog/posts'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get published blog posts' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getPosts", null);
__decorate([
    (0, common_1.Get)('blog/categories'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get blog categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('blog/posts/:slug'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get blog post by slug' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getPost", null);
__decorate([
    (0, common_1.Post)('blog/posts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN, roles_decorator_1.Role.OPERATOR),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "createPost", null);
__decorate([
    (0, common_1.Put)('blog/posts/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN, roles_decorator_1.Role.OPERATOR),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Get)('gallery'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get public gallery items' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getGallery", null);
__decorate([
    (0, common_1.Get)('gallery/admin-all'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gallery items for admin (includes private)' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "adminGetGallery", null);
__decorate([
    (0, common_1.Post)('gallery'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "addGalleryItem", null);
__decorate([
    (0, common_1.Put)('gallery/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update gallery item metadata' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "updateGalleryItem", null);
__decorate([
    (0, common_1.Delete)('gallery/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.SUPERADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "deleteGalleryItem", null);
exports.PublicController = PublicController = __decorate([
    (0, swagger_1.ApiTags)('Public'),
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [public_service_1.PublicService])
], PublicController);
//# sourceMappingURL=public.controller.js.map
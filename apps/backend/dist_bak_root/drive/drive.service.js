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
exports.DriveService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const drive_item_entity_1 = require("./entities/drive-item.entity");
const user_entity_1 = require("../users/entities/user.entity");
let DriveService = class DriveService {
    constructor(itemRepo, shareRepo, userRepo) {
        this.itemRepo = itemRepo;
        this.shareRepo = shareRepo;
        this.userRepo = userRepo;
    }
    async listItems(userId, parentId, trashed = false) {
        const where = { ownerId: userId, isTrashed: trashed };
        where.parentId = parentId ? parentId : (0, typeorm_2.IsNull)();
        const items = await this.itemRepo.find({
            where,
            order: { type: 'DESC', name: 'ASC' },
            withDeleted: false,
        });
        return items;
    }
    async listSharedWithMe(userId) {
        const shares = await this.shareRepo.find({
            where: { sharedWithId: userId },
            relations: ['item', 'item.owner', 'sharedBy'],
        });
        return shares
            .filter((s) => s.item && !s.item.isTrashed && !s.item.deletedAt)
            .map((s) => ({ ...s.item, sharedPermission: s.permission, sharedBy: s.sharedBy }));
    }
    async listStarred(userId) {
        return this.itemRepo.find({
            where: { ownerId: userId, isStarred: true, isTrashed: false },
            order: { name: 'ASC' },
        });
    }
    async listTrashed(userId) {
        return this.itemRepo.find({
            where: { ownerId: userId, isTrashed: true },
            order: { trashedAt: 'DESC' },
        });
    }
    async search(userId, query) {
        return this.itemRepo.find({
            where: [
                { ownerId: userId, name: (0, typeorm_2.ILike)(`%${query}%`), isTrashed: false },
            ],
            order: { name: 'ASC' },
            take: 50,
        });
    }
    async adminListAll(parentId) {
        const where = { isTrashed: false };
        where.parentId = parentId ? parentId : (0, typeorm_2.IsNull)();
        return this.itemRepo.find({
            where,
            relations: ['owner'],
            order: { type: 'DESC', name: 'ASC' },
        });
    }
    async adminListUserFiles(userId) {
        return this.itemRepo.find({
            where: { ownerId: userId, isTrashed: false },
            order: { createdAt: 'DESC' },
        });
    }
    async adminListSharedWithUser(userId) {
        const shares = await this.shareRepo.find({
            where: { sharedWithId: userId },
            relations: ['item', 'item.owner', 'sharedBy'],
        });
        return shares
            .filter((s) => s.item && !s.item.isTrashed && !s.item.deletedAt)
            .map((s) => ({ ...s.item, sharedPermission: s.permission, sharedBy: s.sharedBy }));
    }
    async getItem(id, userId, isAdmin = false) {
        const item = await this.itemRepo.findOne({
            where: { id },
            relations: ['owner', 'shares', 'shares.sharedWith'],
        });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        if (!isAdmin && !this.canAccess(item, userId)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return item;
    }
    async createFolder(userId, dto) {
        if (dto.parentId) {
            await this.assertFolderOwnership(dto.parentId, userId);
        }
        const folder = this.itemRepo.create({
            name: dto.name,
            type: 'folder',
            ownerId: userId,
            parentId: dto.parentId ?? null,
            color: dto.color ?? null,
        });
        return this.itemRepo.save(folder);
    }
    async addFile(userId, dto) {
        if (dto.parentId) {
            await this.assertFolderOwnership(dto.parentId, userId);
        }
        const file = this.itemRepo.create({
            name: dto.name,
            type: 'file',
            storageKey: dto.storageKey,
            mimeType: dto.mimeType ?? null,
            size: dto.size ?? null,
            ownerId: userId,
            parentId: dto.parentId ?? null,
        });
        return this.itemRepo.save(file);
    }
    async updateItem(id, userId, dto) {
        const item = await this.assertOwnership(id, userId);
        if (dto.name !== undefined)
            item.name = dto.name;
        if (dto.color !== undefined)
            item.color = dto.color ?? null;
        if (dto.description !== undefined)
            item.description = dto.description ?? null;
        if (dto.isStarred !== undefined)
            item.isStarred = dto.isStarred;
        return this.itemRepo.save(item);
    }
    async moveItem(id, userId, dto) {
        const item = await this.assertOwnership(id, userId);
        if (dto.targetFolderId) {
            await this.assertFolderOwnership(dto.targetFolderId, userId);
            if (await this.wouldCreateCycle(id, dto.targetFolderId)) {
                throw new common_1.BadRequestException('Cannot move a folder into its own descendant');
            }
        }
        item.parentId = dto.targetFolderId ?? null;
        return this.itemRepo.save(item);
    }
    async copyItem(id, userId, targetFolderId) {
        const item = await this.getItem(id, userId);
        if (targetFolderId) {
            await this.assertFolderOwnership(targetFolderId, userId);
        }
        return this.deepCopy(item, targetFolderId ?? null, userId);
    }
    async deepCopy(item, targetParentId, userId) {
        const copy = this.itemRepo.create({
            name: `${item.name} (copy)`,
            type: item.type,
            storageKey: item.storageKey,
            mimeType: item.mimeType,
            size: item.size,
            ownerId: userId,
            parentId: targetParentId,
            color: item.color,
        });
        const saved = await this.itemRepo.save(copy);
        if (item.type === 'folder') {
            const children = await this.itemRepo.find({ where: { parentId: item.id } });
            for (const child of children) {
                await this.deepCopy(child, saved.id, userId);
            }
        }
        return saved;
    }
    async trashItem(id, userId) {
        const item = await this.assertOwnership(id, userId);
        item.isTrashed = true;
        item.trashedAt = new Date();
        return this.itemRepo.save(item);
    }
    async restoreItem(id, userId) {
        const item = await this.assertOwnership(id, userId);
        item.isTrashed = false;
        item.trashedAt = null;
        return this.itemRepo.save(item);
    }
    async permanentDelete(id, userId, isAdmin = false) {
        const item = await this.itemRepo.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        if (!isAdmin && item.ownerId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        await this.recursiveDelete(item);
    }
    async recursiveDelete(item) {
        if (item.type === 'folder') {
            const children = await this.itemRepo.find({ where: { parentId: item.id } });
            for (const child of children) {
                await this.recursiveDelete(child);
            }
        }
        await this.itemRepo.softDelete(item.id);
    }
    async shareItem(id, ownerId, dto) {
        const item = await this.assertOwnership(id, ownerId);
        const results = [];
        for (const userId of dto.userIds) {
            if (userId === ownerId)
                continue;
            const existing = await this.shareRepo.findOne({
                where: { itemId: item.id, sharedWithId: userId },
            });
            if (existing) {
                existing.permission = dto.permission;
                results.push(await this.shareRepo.save(existing));
            }
            else {
                results.push(await this.shareRepo.save(this.shareRepo.create({
                    itemId: item.id,
                    sharedWithId: userId,
                    sharedById: ownerId,
                    permission: dto.permission,
                })));
            }
        }
        return results;
    }
    async removeShare(itemId, shareId, userId) {
        const item = await this.assertOwnership(itemId, userId);
        const share = await this.shareRepo.findOne({ where: { id: shareId, itemId: item.id } });
        if (!share)
            throw new common_1.NotFoundException('Share not found');
        await this.shareRepo.remove(share);
    }
    async listShares(itemId, userId) {
        await this.assertOwnership(itemId, userId);
        return this.shareRepo.find({
            where: { itemId },
            relations: ['sharedWith', 'sharedBy'],
        });
    }
    async searchUsers(query, excludeId) {
        const q = `%${query}%`;
        return this.userRepo
            .createQueryBuilder('u')
            .where('u.id != :excludeId', { excludeId })
            .andWhere('u.deleted_at IS NULL')
            .andWhere('(u.first_name ILIKE :q OR u.last_name ILIKE :q OR u.email ILIKE :q OR u.phone ILIKE :q)', { q })
            .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.phone', 'u.profilePhotoUrl'])
            .take(20)
            .getMany();
    }
    async getBreadcrumb(folderId, userId, isAdmin = false) {
        const crumbs = [];
        let current = await this.itemRepo.findOne({ where: { id: folderId } });
        while (current) {
            if (!isAdmin && current.ownerId !== userId)
                break;
            crumbs.unshift({ id: current.id, name: current.name });
            if (!current.parentId)
                break;
            current = await this.itemRepo.findOne({ where: { id: current.parentId } });
        }
        return crumbs;
    }
    async getStorageStats(userId) {
        const result = await this.itemRepo
            .createQueryBuilder('i')
            .select('SUM(i.size)', 'used')
            .addSelect('COUNT(i.id)', 'total')
            .where('i.owner_id = :userId AND i.type = :type AND i.is_trashed = false', {
            userId,
            type: 'file',
        })
            .getRawOne();
        return {
            usedBytes: Number(result?.used ?? 0),
            totalFiles: Number(result?.total ?? 0),
        };
    }
    async assertOwnership(id, userId) {
        const item = await this.itemRepo.findOne({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        if (item.ownerId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        return item;
    }
    async assertFolderOwnership(folderId, userId) {
        const folder = await this.itemRepo.findOne({ where: { id: folderId } });
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        if (folder.type !== 'folder')
            throw new common_1.BadRequestException('Target must be a folder');
        if (folder.ownerId !== userId)
            throw new common_1.ForbiddenException('Access denied to target folder');
        return folder;
    }
    canAccess(item, userId) {
        if (item.ownerId === userId)
            return true;
        return item.shares?.some((s) => s.sharedWithId === userId) ?? false;
    }
    async wouldCreateCycle(itemId, targetId) {
        let current = await this.itemRepo.findOne({ where: { id: targetId } });
        while (current?.parentId) {
            if (current.parentId === itemId)
                return true;
            current = await this.itemRepo.findOne({ where: { id: current.parentId } });
        }
        return false;
    }
    async getDescendantFiles(folderId, userId, isAdmin = false) {
        const folder = await this.itemRepo.findOne({ where: { id: folderId } });
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        if (!isAdmin && folder.ownerId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        return this.collectFiles(folderId);
    }
    async collectFiles(folderId) {
        const files = [];
        const children = await this.itemRepo.find({ where: { parentId: folderId, isTrashed: false } });
        for (const child of children) {
            if (child.type === 'file') {
                files.push(child);
            }
            else {
                const nested = await this.collectFiles(child.id);
                files.push(...nested);
            }
        }
        return files;
    }
};
exports.DriveService = DriveService;
exports.DriveService = DriveService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(drive_item_entity_1.DriveItem)),
    __param(1, (0, typeorm_1.InjectRepository)(drive_item_entity_1.DriveShare)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DriveService);
//# sourceMappingURL=drive.service.js.map
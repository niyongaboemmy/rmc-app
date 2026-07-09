import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { DriveItem, DriveShare } from './entities/drive-item.entity';
import { User } from '../users/entities/user.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { AddFileDto } from './dto/add-file.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ShareItemDto } from './dto/share-item.dto';
import { MoveItemDto } from './dto/move-item.dto';

@Injectable()
export class DriveService {
  constructor(
    @InjectRepository(DriveItem)
    private readonly itemRepo: Repository<DriveItem>,
    @InjectRepository(DriveShare)
    private readonly shareRepo: Repository<DriveShare>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Listing ──────────────────────────────────────────────────────────────

  async listItems(userId: string, parentId?: string, trashed = false) {
    const where: any = { ownerId: userId, isTrashed: trashed };
    where.parentId = parentId ? parentId : IsNull();
    const items = await this.itemRepo.find({
      where,
      order: { type: 'DESC', name: 'ASC' },
      withDeleted: false,
    });
    return items;
  }

  async listSharedWithMe(userId: string) {
    const shares = await this.shareRepo.find({
      where: { sharedWithId: userId },
      relations: ['item', 'item.owner', 'sharedBy'],
    });
    return shares
      .filter((s) => s.item && !s.item.isTrashed && !s.item.deletedAt)
      .map((s) => ({ ...s.item, sharedPermission: s.permission, sharedBy: s.sharedBy }));
  }

  async listStarred(userId: string) {
    return this.itemRepo.find({
      where: { ownerId: userId, isStarred: true, isTrashed: false },
      order: { name: 'ASC' },
    });
  }

  async listTrashed(userId: string) {
    return this.itemRepo.find({
      where: { ownerId: userId, isTrashed: true },
      order: { trashedAt: 'DESC' },
    });
  }

  async search(userId: string, query: string) {
    return this.itemRepo.find({
      where: [{ ownerId: userId, name: ILike(`%${query}%`), isTrashed: false }],
      order: { name: 'ASC' },
      take: 50,
    });
  }

  // ── Admin listing ─────────────────────────────────────────────────────────

  async adminListAll(parentId?: string) {
    const where: any = { isTrashed: false };
    where.parentId = parentId ? parentId : IsNull();
    return this.itemRepo.find({
      where,
      relations: ['owner'],
      order: { type: 'DESC', name: 'ASC' },
    });
  }

  async adminListUserFiles(userId: string) {
    return this.itemRepo.find({
      where: { ownerId: userId, isTrashed: false },
      order: { createdAt: 'DESC' },
    });
  }

  async adminListSharedWithUser(userId: string) {
    const shares = await this.shareRepo.find({
      where: { sharedWithId: userId },
      relations: ['item', 'item.owner', 'sharedBy'],
    });
    return shares
      .filter((s) => s.item && !s.item.isTrashed && !s.item.deletedAt)
      .map((s) => ({ ...s.item, sharedPermission: s.permission, sharedBy: s.sharedBy }));
  }

  // ── Get single item ───────────────────────────────────────────────────────

  async getItem(id: string, userId: string, isAdmin = false) {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['owner', 'shares', 'shares.sharedWith'],
    });
    if (!item) throw new NotFoundException('Item not found');
    if (!isAdmin && !this.canAccess(item, userId)) {
      throw new ForbiddenException('Access denied');
    }
    return item;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createFolder(userId: string, dto: CreateFolderDto) {
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

  async addFile(userId: string, dto: AddFileDto) {
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

  // ── Update ────────────────────────────────────────────────────────────────

  async updateItem(id: string, userId: string, dto: UpdateItemDto) {
    const item = await this.assertOwnership(id, userId);
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.color !== undefined) item.color = dto.color ?? null;
    if (dto.description !== undefined) item.description = dto.description ?? null;
    if (dto.isStarred !== undefined) item.isStarred = dto.isStarred;
    return this.itemRepo.save(item);
  }

  // ── Move ──────────────────────────────────────────────────────────────────

  async moveItem(id: string, userId: string, dto: MoveItemDto) {
    const item = await this.assertOwnership(id, userId);
    if (dto.targetFolderId) {
      await this.assertFolderOwnership(dto.targetFolderId, userId);
      if (await this.wouldCreateCycle(id, dto.targetFolderId)) {
        throw new BadRequestException('Cannot move a folder into its own descendant');
      }
    }
    item.parentId = dto.targetFolderId ?? null;
    return this.itemRepo.save(item);
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  async copyItem(id: string, userId: string, targetFolderId?: string) {
    const item = await this.getItem(id, userId);
    if (targetFolderId) {
      await this.assertFolderOwnership(targetFolderId, userId);
    }
    return this.deepCopy(item, targetFolderId ?? null, userId);
  }

  private async deepCopy(
    item: DriveItem,
    targetParentId: string | null,
    userId: string,
  ): Promise<DriveItem> {
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

  // ── Trash / Delete ────────────────────────────────────────────────────────

  async trashItem(id: string, userId: string) {
    const item = await this.assertOwnership(id, userId);
    item.isTrashed = true;
    item.trashedAt = new Date();
    return this.itemRepo.save(item);
  }

  async restoreItem(id: string, userId: string) {
    const item = await this.assertOwnership(id, userId);
    item.isTrashed = false;
    item.trashedAt = null;
    return this.itemRepo.save(item);
  }

  async permanentDelete(id: string, userId: string, isAdmin = false) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (!isAdmin && item.ownerId !== userId) throw new ForbiddenException('Access denied');
    await this.recursiveDelete(item);
  }

  private async recursiveDelete(item: DriveItem) {
    if (item.type === 'folder') {
      const children = await this.itemRepo.find({ where: { parentId: item.id } });
      for (const child of children) {
        await this.recursiveDelete(child);
      }
    }
    await this.itemRepo.softDelete(item.id);
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  async shareItem(id: string, ownerId: string, dto: ShareItemDto) {
    const item = await this.assertOwnership(id, ownerId);
    const results = [];
    for (const userId of dto.userIds) {
      if (userId === ownerId) continue;
      const existing = await this.shareRepo.findOne({
        where: { itemId: item.id, sharedWithId: userId },
      });
      if (existing) {
        existing.permission = dto.permission;
        results.push(await this.shareRepo.save(existing));
      } else {
        results.push(
          await this.shareRepo.save(
            this.shareRepo.create({
              itemId: item.id,
              sharedWithId: userId,
              sharedById: ownerId,
              permission: dto.permission,
            }),
          ),
        );
      }
    }
    return results;
  }

  async removeShare(itemId: string, shareId: string, userId: string) {
    const item = await this.assertOwnership(itemId, userId);
    const share = await this.shareRepo.findOne({ where: { id: shareId, itemId: item.id } });
    if (!share) throw new NotFoundException('Share not found');
    await this.shareRepo.remove(share);
  }

  async listShares(itemId: string, userId: string) {
    await this.assertOwnership(itemId, userId);
    return this.shareRepo.find({
      where: { itemId },
      relations: ['sharedWith', 'sharedBy'],
    });
  }

  // ── User search (for sharing) ─────────────────────────────────────────────

  async searchUsers(query: string, excludeId: string) {
    const q = `%${query}%`;
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.id != :excludeId', { excludeId })
      .andWhere('u.deleted_at IS NULL')
      .andWhere(
        '(u.first_name ILIKE :q OR u.last_name ILIKE :q OR u.email ILIKE :q OR u.phone ILIKE :q)',
        { q },
      )
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.phone', 'u.profilePhotoUrl'])
      .take(20)
      .getMany();
  }

  // ── Folder path (breadcrumb) ──────────────────────────────────────────────

  async getBreadcrumb(folderId: string, userId: string, isAdmin = false) {
    const crumbs: { id: string; name: string }[] = [];
    let current = await this.itemRepo.findOne({ where: { id: folderId } });
    while (current) {
      if (!isAdmin && current.ownerId !== userId) break;
      crumbs.unshift({ id: current.id, name: current.name });
      if (!current.parentId) break;
      current = await this.itemRepo.findOne({ where: { id: current.parentId } });
    }
    return crumbs;
  }

  // ── Storage stats ─────────────────────────────────────────────────────────

  async getStorageStats(userId: string) {
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertOwnership(id: string, userId: string): Promise<DriveItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== userId) throw new ForbiddenException('Access denied');
    return item;
  }

  private async assertFolderOwnership(folderId: string, userId: string): Promise<DriveItem> {
    const folder = await this.itemRepo.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.type !== 'folder') throw new BadRequestException('Target must be a folder');
    if (folder.ownerId !== userId) throw new ForbiddenException('Access denied to target folder');
    return folder;
  }

  private canAccess(item: DriveItem, userId: string): boolean {
    if (item.ownerId === userId) return true;
    return item.shares?.some((s) => s.sharedWithId === userId) ?? false;
  }

  private async wouldCreateCycle(itemId: string, targetId: string): Promise<boolean> {
    let current = await this.itemRepo.findOne({ where: { id: targetId } });
    while (current?.parentId) {
      if (current.parentId === itemId) return true;
      current = await this.itemRepo.findOne({ where: { id: current.parentId } });
    }
    return false;
  }

  // ── Get storage key for streaming (zip download) ──────────────────────────

  async getDescendantFiles(
    folderId: string,
    userId: string,
    isAdmin = false,
  ): Promise<DriveItem[]> {
    const folder = await this.itemRepo.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (!isAdmin && folder.ownerId !== userId) throw new ForbiddenException('Access denied');
    return this.collectFiles(folderId);
  }

  private async collectFiles(folderId: string): Promise<DriveItem[]> {
    const files: DriveItem[] = [];
    const children = await this.itemRepo.find({ where: { parentId: folderId, isTrashed: false } });
    for (const child of children) {
      if (child.type === 'file') {
        files.push(child);
      } else {
        const nested = await this.collectFiles(child.id);
        files.push(...nested);
      }
    }
    return files;
  }
}

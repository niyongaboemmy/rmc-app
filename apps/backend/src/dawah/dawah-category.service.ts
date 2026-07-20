import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DawahCategory } from './entities/dawah-category.entity';
import { CreateDawahCategoryDto } from './dto/create-dawah-category.dto';
import { UpdateDawahCategoryDto } from './dto/update-dawah-category.dto';
import { slugify } from './dawah-slug.util';

/**
 * The taxonomy shared by courses and the library. An ordered, activatable,
 * soft-deletable collection — the same shape as HajjRequirementService.
 */
@Injectable()
export class DawahCategoryService {
  constructor(
    @InjectRepository(DawahCategory)
    private readonly categories: Repository<DawahCategory>,
  ) {}

  /** What the public filter bar shows: active only, in admin-defined order. */
  async listPublic(): Promise<DawahCategory[]> {
    return this.categories.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Admin listing — includes deactivated categories, still in order. */
  async adminList(): Promise<DawahCategory[]> {
    return this.categories.find({ order: { sortOrder: 'ASC' } });
  }

  async findOne(id: string): Promise<DawahCategory> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateDawahCategoryDto): Promise<DawahCategory> {
    const slug = slugify(dto.slug || dto.nameEn);
    if (!slug) {
      throw new BadRequestException('Could not derive a slug from the name — provide one');
    }

    // withDeleted: the unique index spans soft-deleted rows, so a slug freed in
    // the UI is not actually free. Without this the insert fails at the
    // database with a constraint error instead of a message anyone can act on.
    const existing = await this.categories.findOne({ where: { slug }, withDeleted: true });
    if (existing) {
      throw new BadRequestException(`A category with slug "${slug}" already exists`);
    }

    const max = await this.categories
      .createQueryBuilder('c')
      .select('MAX(c.sort_order)', 'm')
      .getRawOne<{ m: number | null }>();

    return this.categories.save(
      this.categories.create({
        slug,
        nameEn: dto.nameEn,
        // The tri-lingual siblings are NOT NULL DEFAULT '' — the service, not
        // the DTO, supplies the empty string. The UI falls back to English.
        nameRw: dto.nameRw ?? '',
        nameAr: dto.nameAr ?? '',
        icon: dto.icon ?? null,
        sortOrder: dto.sortOrder ?? Number(max?.m ?? -1) + 1,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateDawahCategoryDto): Promise<DawahCategory> {
    const category = await this.findOne(id);
    Object.assign(category, {
      nameEn: dto.nameEn ?? category.nameEn,
      nameRw: dto.nameRw ?? category.nameRw,
      nameAr: dto.nameAr ?? category.nameAr,
      // icon is nullable: `undefined` means "unchanged", explicit null means
      // "clear it", so it can't use the ?? shorthand.
      icon: dto.icon !== undefined ? dto.icon : category.icon,
      sortOrder: dto.sortOrder ?? category.sortOrder,
      isActive: dto.isActive ?? category.isActive,
    });
    return this.categories.save(category);
  }

  /**
   * Soft delete. Courses and books that referenced this category keep working —
   * their FK is ON DELETE SET NULL, and a soft delete doesn't even fire that;
   * they simply point at a row the public listing no longer surfaces. Nothing
   * cascades, nothing 404s.
   */
  async remove(id: string): Promise<{ id: string }> {
    const category = await this.findOne(id);
    await this.categories.softRemove(category);
    return { id };
  }
}

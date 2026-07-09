import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationSubFund } from './entities/donation-subfund.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubFundDto,
  UpdateSubFundDto,
  TriText,
  TriList,
} from './dto/category-content.dto';

type Locale = 'en' | 'rw' | 'ar';

@Injectable()
export class DonationCategoriesService {
  constructor(
    @InjectRepository(DonationCategory)
    private readonly categories: Repository<DonationCategory>,
    @InjectRepository(DonationSubFund)
    private readonly subfunds: Repository<DonationSubFund>,
  ) {}

  // ── Public: localized tree for the donate page ─────────────────────────────

  /** Active categories + active sub-funds, with text resolved to one locale. */
  async listPublic(locale: string) {
    const loc: Locale = (['en', 'rw', 'ar'].includes(locale) ? locale : 'en') as Locale;
    const cats = await this.categories.find({
      where: { status: 'active' },
      relations: ['subfunds'],
      order: { sortOrder: 'ASC' },
    });
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return cats.map((c) => ({
      id: c.id,
      key: c.key,
      icon: c.icon,
      tone: c.tone,
      image: c.image,
      title: c[`title${cap(loc)}` as keyof DonationCategory] as string,
      desc: c[`desc${cap(loc)}` as keyof DonationCategory] as string,
      long: c[`long${cap(loc)}` as keyof DonationCategory] as string,
      impact: c[`impact${cap(loc)}` as keyof DonationCategory] as string,
      subfunds: (c.subfunds ?? [])
        .filter((s) => s.status === 'active')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          id: s.id,
          key: s.key,
          image: s.image,
          campaignSlug: s.campaignSlug,
          label: s[`label${cap(loc)}` as keyof DonationSubFund] as string,
          long: s[`long${cap(loc)}` as keyof DonationSubFund] as string,
          impact: s[`impact${cap(loc)}` as keyof DonationSubFund] as string,
          examples: s[`examples${cap(loc)}` as keyof DonationSubFund] as string[],
        })),
    }));
  }

  // ── Admin: full multilingual tree ──────────────────────────────────────────

  adminList(): Promise<DonationCategory[]> {
    return this.categories.find({ relations: ['subfunds'], order: { sortOrder: 'ASC' } });
  }

  // ── Helpers: map nested tri-objects onto entity columns ─────────────────────

  private applyTri<T>(target: T, field: string, tri?: TriText): void {
    if (!tri) return;
    const t = target as Record<string, unknown>;
    if (tri.en !== undefined) t[`${field}En`] = tri.en;
    if (tri.rw !== undefined) t[`${field}Rw`] = tri.rw;
    if (tri.ar !== undefined) t[`${field}Ar`] = tri.ar;
  }

  private applyTriList<T>(target: T, field: string, tri?: TriList): void {
    if (!tri) return;
    const t = target as Record<string, unknown>;
    if (tri.en !== undefined) t[`${field}En`] = tri.en;
    if (tri.rw !== undefined) t[`${field}Rw`] = tri.rw;
    if (tri.ar !== undefined) t[`${field}Ar`] = tri.ar;
  }

  // ── Admin: category CRUD ────────────────────────────────────────────────────

  async createCategory(dto: CreateCategoryDto): Promise<DonationCategory> {
    const c = this.categories.create({
      key: dto.key,
      icon: dto.icon ?? 'HandHeart',
      tone: dto.tone ?? 'green',
      image: dto.image ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status: (dto.status as 'active' | 'inactive') ?? 'active',
    });
    this.applyTri(c, 'title', dto.title);
    this.applyTri(c, 'desc', dto.desc);
    this.applyTri(c, 'long', dto.long);
    this.applyTri(c, 'impact', dto.impact);
    return this.categories.save(c);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<DonationCategory> {
    const c = await this.categories.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    if (dto.key !== undefined) c.key = dto.key;
    if (dto.icon !== undefined) c.icon = dto.icon;
    if (dto.tone !== undefined) c.tone = dto.tone;
    if (dto.image !== undefined) c.image = dto.image || null;
    if (dto.sortOrder !== undefined) c.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) c.status = dto.status as 'active' | 'inactive';
    this.applyTri(c, 'title', dto.title);
    this.applyTri(c, 'desc', dto.desc);
    this.applyTri(c, 'long', dto.long);
    this.applyTri(c, 'impact', dto.impact);
    return this.categories.save(c);
  }

  async deleteCategory(id: string): Promise<{ id: string }> {
    const c = await this.categories.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    // Soft-delete (archive): the row stays, hidden from admin/public lists. Its
    // sub-funds are kept and restored alongside it.
    await this.categories.softRemove(c);
    return { id };
  }

  /** Archived (soft-deleted) categories, most-recently-deleted first, for the restore view. */
  adminListDeletedCategories(): Promise<DonationCategory[]> {
    return this.categories.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      relations: ['subfunds'],
      order: { deletedAt: 'DESC' },
    });
  }

  /** Restore an archived category. No-op if it isn't deleted. */
  async restoreCategory(id: string): Promise<{ id: string }> {
    const c = await this.categories.findOne({ where: { id }, withDeleted: true });
    if (!c) throw new NotFoundException('Category not found');
    if (c.deletedAt) await this.categories.recover(c);
    return { id };
  }

  // ── Admin: sub-fund CRUD ────────────────────────────────────────────────────

  async createSubFund(categoryId: string, dto: CreateSubFundDto): Promise<DonationSubFund> {
    const cat = await this.categories.findOne({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    const s = this.subfunds.create({
      categoryId,
      key: dto.key,
      image: dto.image ?? null,
      campaignSlug: dto.campaignSlug ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status: (dto.status as 'active' | 'inactive') ?? 'active',
    });
    this.applyTri(s, 'label', dto.label);
    this.applyTri(s, 'long', dto.long);
    this.applyTri(s, 'impact', dto.impact);
    this.applyTriList(s, 'examples', dto.examples);
    return this.subfunds.save(s);
  }

  async updateSubFund(id: string, dto: UpdateSubFundDto): Promise<DonationSubFund> {
    const s = await this.subfunds.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Sub-fund not found');
    if (dto.key !== undefined) s.key = dto.key;
    if (dto.image !== undefined) s.image = dto.image || null;
    if (dto.campaignSlug !== undefined) s.campaignSlug = dto.campaignSlug || null;
    if (dto.sortOrder !== undefined) s.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) s.status = dto.status as 'active' | 'inactive';
    this.applyTri(s, 'label', dto.label);
    this.applyTri(s, 'long', dto.long);
    this.applyTri(s, 'impact', dto.impact);
    this.applyTriList(s, 'examples', dto.examples);
    return this.subfunds.save(s);
  }

  async deleteSubFund(id: string): Promise<{ id: string }> {
    const s = await this.subfunds.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Sub-fund not found');
    await this.subfunds.remove(s);
    return { id };
  }
}

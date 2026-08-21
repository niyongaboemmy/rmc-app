import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { HajjRequirement } from './entities/hajj-requirement.entity';
import { CreateHajjRequirementDto } from './dto/create-hajj-requirement.dto';
import { UpdateHajjRequirementDto } from './dto/update-hajj-requirement.dto';

/**
 * CMS for the Hajj requirements shown on the public page. Mirrors
 * FuneralStepService: an ordered, per-locale, activatable collection.
 */
@Injectable()
export class HajjRequirementService {
  constructor(
    @InjectRepository(HajjRequirement)
    private readonly requirements: Repository<HajjRequirement>,
  ) {}

  /** All requirements ordered; `activeOnly` restricts to what the public page shows. */
  async findAll(activeOnly = false): Promise<HajjRequirement[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.requirements.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findAllDto(activeOnly = false) {
    return (await this.findAll(activeOnly)).map((r) => this.toDto(r));
  }

  async create(dto: CreateHajjRequirementDto) {
    // withDeleted: a soft-deleted row still holds the unique key, so re-using it
    // would fail at the database with a constraint error rather than a message.
    const existing = await this.requirements.findOne({
      where: { key: dto.key },
      withDeleted: true,
    });
    if (existing) {
      throw new BadRequestException(`A requirement with key "${dto.key}" already exists`);
    }

    const max = await this.requirements
      .createQueryBuilder('r')
      .select('MAX(r.sort_order)', 'm')
      .getRawOne<{ m: number | null }>();

    const entity = this.requirements.create({
      key: dto.key,
      titleEn: dto.titleEn,
      titleRw: dto.titleRw ?? '',
      titleAr: dto.titleAr ?? '',
      descriptionEn: dto.descriptionEn ?? '',
      descriptionRw: dto.descriptionRw ?? '',
      descriptionAr: dto.descriptionAr ?? '',
      amount: dto.amount ?? null,
      currency: dto.currency ?? 'RWF',
      mandatory: dto.mandatory ?? true,
      sortOrder: dto.sortOrder ?? Number(max?.m ?? -1) + 1,
      isActive: dto.isActive ?? true,
      icon: dto.icon ?? null,
    });
    return this.toDto(await this.requirements.save(entity));
  }

  async update(id: string, dto: UpdateHajjRequirementDto) {
    const req = await this.get(id);
    Object.assign(req, {
      titleEn: dto.titleEn ?? req.titleEn,
      titleRw: dto.titleRw ?? req.titleRw,
      titleAr: dto.titleAr ?? req.titleAr,
      descriptionEn: dto.descriptionEn ?? req.descriptionEn,
      descriptionRw: dto.descriptionRw ?? req.descriptionRw,
      descriptionAr: dto.descriptionAr ?? req.descriptionAr,
      // amount and icon are nullable — `undefined` means "unchanged", but an
      // explicit null means "clear it", so they can't use the ?? shorthand.
      amount: dto.amount !== undefined ? dto.amount : req.amount,
      icon: dto.icon !== undefined ? dto.icon : req.icon,
      currency: dto.currency ?? req.currency,
      mandatory: dto.mandatory ?? req.mandatory,
      sortOrder: dto.sortOrder ?? req.sortOrder,
      isActive: dto.isActive ?? req.isActive,
    });
    return this.toDto(await this.requirements.save(req));
  }

  async remove(id: string) {
    const req = await this.get(id);
    await this.requirements.softRemove(req);
    return { id, deleted: true };
  }

  async reorder(ids: string[]) {
    const rows = await this.requirements.find({ where: { id: In(ids) } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const updated: HajjRequirement[] = [];
    ids.forEach((id, index) => {
      const row = byId.get(id);
      if (row) {
        row.sortOrder = index;
        updated.push(row);
      }
    });
    await this.requirements.save(updated);
    return this.findAllDto(false);
  }

  private async get(id: string): Promise<HajjRequirement> {
    const req = await this.requirements.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Requirement not found');
    return req;
  }

  /** Flat per-locale columns → the nested {en,rw,ar} shape the frontend picks from. */
  toDto(r: HajjRequirement) {
    return {
      id: r.id,
      key: r.key,
      title: { en: r.titleEn, rw: r.titleRw, ar: r.titleAr },
      description: { en: r.descriptionEn, rw: r.descriptionRw, ar: r.descriptionAr },
      amount: r.amount,
      currency: r.currency,
      mandatory: r.mandatory,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      icon: r.icon ?? undefined,
    };
  }
}

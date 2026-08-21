import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FuneralStep } from './entities/funeral-step.entity';
import { FuneralRequest } from './entities/funeral-request.entity';
import { CreateFuneralStepDto } from './dto/create-funeral-step.dto';
import { UpdateFuneralStepDto } from './dto/update-funeral-step.dto';

@Injectable()
export class FuneralStepService {
  constructor(
    @InjectRepository(FuneralStep)
    private readonly steps: Repository<FuneralStep>,
    @InjectRepository(FuneralRequest)
    private readonly requests: Repository<FuneralRequest>,
  ) {}

  /** All steps ordered; `activeOnly` restricts to the live lifecycle. */
  async findAll(activeOnly = false): Promise<FuneralStep[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.steps.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findAllDto(activeOnly = false) {
    return (await this.findAll(activeOnly)).map((s) => this.toDto(s));
  }

  async create(dto: CreateFuneralStepDto) {
    const existing = await this.steps.findOne({ where: { key: dto.key }, withDeleted: true });
    if (existing) throw new BadRequestException(`A step with key "${dto.key}" already exists`);
    const max = await this.steps.createQueryBuilder('s').select('MAX(s.sort_order)', 'm').getRawOne<{ m: number | null }>();
    const entity = this.steps.create({
      key: dto.key,
      titleEn: dto.titleEn,
      titleRw: dto.titleRw ?? '',
      titleAr: dto.titleAr ?? '',
      descriptionEn: dto.descriptionEn ?? '',
      descriptionRw: dto.descriptionRw ?? '',
      descriptionAr: dto.descriptionAr ?? '',
      sortOrder: dto.sortOrder ?? (Number(max?.m ?? -1) + 1),
      isActive: dto.isActive ?? true,
      color: dto.color ?? null,
      icon: dto.icon ?? null,
    });
    return this.toDto(await this.steps.save(entity));
  }

  async update(id: string, dto: UpdateFuneralStepDto) {
    const step = await this.get(id);
    Object.assign(step, {
      titleEn: dto.titleEn ?? step.titleEn,
      titleRw: dto.titleRw ?? step.titleRw,
      titleAr: dto.titleAr ?? step.titleAr,
      descriptionEn: dto.descriptionEn ?? step.descriptionEn,
      descriptionRw: dto.descriptionRw ?? step.descriptionRw,
      descriptionAr: dto.descriptionAr ?? step.descriptionAr,
      sortOrder: dto.sortOrder ?? step.sortOrder,
      isActive: dto.isActive ?? step.isActive,
      color: dto.color !== undefined ? dto.color : step.color,
      icon: dto.icon !== undefined ? dto.icon : step.icon,
    });
    return this.toDto(await this.steps.save(step));
  }

  async remove(id: string) {
    const step = await this.get(id);
    const inUse = await this.requests.count({ where: { stage: step.key } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete "${step.key}": ${inUse} request(s) are on this step. Move them first or deactivate the step instead.`,
      );
    }
    await this.steps.softRemove(step);
    return { id, deleted: true };
  }

  async reorder(ids: string[]) {
    const rows = await this.steps.find({ where: { id: In(ids) } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const updated: FuneralStep[] = [];
    ids.forEach((id, index) => {
      const row = byId.get(id);
      if (row) { row.sortOrder = index; updated.push(row); }
    });
    await this.steps.save(updated);
    return this.findAllDto(false);
  }

  private async get(id: string): Promise<FuneralStep> {
    const step = await this.steps.findOne({ where: { id } });
    if (!step) throw new NotFoundException('Step not found');
    return step;
  }

  toDto(s: FuneralStep) {
    return {
      id: s.id,
      key: s.key,
      title: { en: s.titleEn, rw: s.titleRw, ar: s.titleAr },
      description: { en: s.descriptionEn, rw: s.descriptionRw, ar: s.descriptionAr },
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      color: s.color ?? undefined,
      icon: s.icon ?? undefined,
    };
  }
}

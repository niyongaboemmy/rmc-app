import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FuneralSkill } from './entities/funeral-skill.entity';
import { FuneralVolunteer } from './entities/funeral-volunteer.entity';
import { CreateFuneralSkillDto } from './dto/create-funeral-skill.dto';
import { UpdateFuneralSkillDto } from './dto/update-funeral-skill.dto';

@Injectable()
export class FuneralSkillService {
  constructor(
    @InjectRepository(FuneralSkill)
    private readonly skills: Repository<FuneralSkill>,
    @InjectRepository(FuneralVolunteer)
    private readonly volunteers: Repository<FuneralVolunteer>,
  ) {}

  async findAll(activeOnly = false): Promise<FuneralSkill[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.skills.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findAllDto(activeOnly = false) {
    return (await this.findAll(activeOnly)).map((s) => this.toDto(s));
  }

  async create(dto: CreateFuneralSkillDto) {
    const existing = await this.skills.findOne({ where: { key: dto.key }, withDeleted: true });
    if (existing) throw new BadRequestException(`A skill with key "${dto.key}" already exists`);
    const max = await this.skills.createQueryBuilder('s').select('MAX(s.sort_order)', 'm').getRawOne<{ m: number | null }>();
    const entity = this.skills.create({
      key: dto.key,
      labelEn: dto.labelEn,
      labelRw: dto.labelRw ?? '',
      labelAr: dto.labelAr ?? '',
      sortOrder: dto.sortOrder ?? (Number(max?.m ?? -1) + 1),
      isActive: dto.isActive ?? true,
    });
    return this.toDto(await this.skills.save(entity));
  }

  async update(id: string, dto: UpdateFuneralSkillDto) {
    const skill = await this.get(id);
    Object.assign(skill, {
      labelEn: dto.labelEn ?? skill.labelEn,
      labelRw: dto.labelRw ?? skill.labelRw,
      labelAr: dto.labelAr ?? skill.labelAr,
      sortOrder: dto.sortOrder ?? skill.sortOrder,
      isActive: dto.isActive ?? skill.isActive,
    });
    return this.toDto(await this.skills.save(skill));
  }

  async remove(id: string) {
    const skill = await this.get(id);
    const inUse = await this.volunteers
      .createQueryBuilder('v')
      .where('v.skills @> :k', { k: JSON.stringify([skill.key]) })
      .orWhere('v.assigned_task = :key', { key: skill.key })
      .getCount();
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete "${skill.key}": ${inUse} volunteer(s) have this skill. Remove it from them first, or deactivate the skill instead.`,
      );
    }
    await this.skills.softRemove(skill);
    return { id, deleted: true };
  }

  async reorder(ids: string[]) {
    const rows = await this.skills.find({ where: { id: In(ids) } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const updated: FuneralSkill[] = [];
    ids.forEach((id, index) => {
      const row = byId.get(id);
      if (row) { row.sortOrder = index; updated.push(row); }
    });
    await this.skills.save(updated);
    return this.findAllDto(false);
  }

  private async get(id: string): Promise<FuneralSkill> {
    const skill = await this.skills.findOne({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }

  toDto(s: FuneralSkill) {
    return {
      id: s.id,
      key: s.key,
      label: { en: s.labelEn, rw: s.labelRw, ar: s.labelAr },
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    };
  }
}

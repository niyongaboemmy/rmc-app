import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FuneralVolunteer } from './entities/funeral-volunteer.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto';
import { AssignVolunteerDto } from './dto/assign-volunteer.dto';

@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(FuneralVolunteer)
    private readonly volunteers: Repository<FuneralVolunteer>,
    @InjectRepository(Mosque)
    private readonly mosques: Repository<Mosque>,
  ) {}

  async findAll() {
    const rows = await this.volunteers.find({ order: { name: 'ASC' } });
    const names = await this.mosqueNames(rows.map((v) => v.mosqueId));
    return rows.map((v) => this.toDto(v, names));
  }

  async create(dto: CreateVolunteerDto) {
    const entity = this.volunteers.create({
      name: dto.name,
      phone: dto.phone || null,
      mosqueId: dto.mosqueId,
      skills: dto.skills,
      available: true,
      assignedTask: null,
      assignedRequestId: null,
    });
    const saved = await this.volunteers.save(entity);
    return this.toDto(saved, await this.mosqueNames([saved.mosqueId]));
  }

  async update(id: string, dto: UpdateVolunteerDto) {
    const entity = await this.get(id);
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.phone !== undefined) entity.phone = dto.phone || null;
    if (dto.mosqueId !== undefined) entity.mosqueId = dto.mosqueId;
    if (dto.skills !== undefined) {
      entity.skills = dto.skills;
      // Drop an assignment whose task the volunteer no longer has.
      if (entity.assignedTask && !dto.skills.includes(entity.assignedTask)) {
        entity.assignedTask = null;
        entity.assignedRequestId = null;
        entity.available = true;
      }
    }
    const saved = await this.volunteers.save(entity);
    return this.toDto(saved, await this.mosqueNames([saved.mosqueId]));
  }

  async remove(id: string) {
    const entity = await this.get(id);
    await this.volunteers.softRemove(entity);
    return { id, deleted: true };
  }

  async assign(id: string, dto: AssignVolunteerDto) {
    const entity = await this.get(id);
    entity.assignedTask = dto.task;
    entity.assignedRequestId = dto.requestId;
    entity.available = false;
    const saved = await this.volunteers.save(entity);
    return this.toDto(saved, await this.mosqueNames([saved.mosqueId]));
  }

  async unassign(id: string) {
    const entity = await this.get(id);
    entity.assignedTask = null;
    entity.assignedRequestId = null;
    entity.available = true;
    const saved = await this.volunteers.save(entity);
    return this.toDto(saved, await this.mosqueNames([saved.mosqueId]));
  }

  private async get(id: string): Promise<FuneralVolunteer> {
    const entity = await this.volunteers.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Volunteer not found');
    return entity;
  }

  private async mosqueNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await this.mosques.find({ where: { id: In(unique) }, select: ['id', 'name'] });
    return new Map(rows.map((m) => [m.id, m.name]));
  }

  private toDto(v: FuneralVolunteer, mosqueNames: Map<string, string>) {
    return {
      id: v.id,
      name: v.name,
      phone: v.phone ?? '',
      mosqueId: v.mosqueId,
      mosqueName: mosqueNames.get(v.mosqueId) ?? '',
      skills: v.skills ?? [],
      available: v.available,
      assignedTask: v.assignedTask ?? undefined,
      assignedRequestId: v.assignedRequestId ?? undefined,
    };
  }
}

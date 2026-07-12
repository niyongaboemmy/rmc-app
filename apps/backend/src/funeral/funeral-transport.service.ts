import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FuneralTransport } from './entities/funeral-transport.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { CreateFuneralTransportDto } from './dto/create-funeral-transport.dto';
import { UpdateFuneralTransportDto } from './dto/update-funeral-transport.dto';

/** Store phones canonically as local 07XXXXXXXX (accepts +250/250 input). */
const normalizePhone = (v: string) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.startsWith('250') ? `0${d.slice(3)}` : d;
};

@Injectable()
export class FuneralTransportService {
  constructor(
    @InjectRepository(FuneralTransport)
    private readonly transports: Repository<FuneralTransport>,
    @InjectRepository(Mosque)
    private readonly mosques: Repository<Mosque>,
  ) {}

  /** List transports (public gets active only), sorted by mosque then name. */
  async findAll(opts: { activeOnly?: boolean } = {}) {
    const rows = await this.transports.find({
      where: opts.activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
    const names = await this.mosqueNames(rows.map((r) => r.mosqueId));
    return rows
      .map((r) => this.toDto(r, names))
      .sort((a, b) => a.mosque.localeCompare(b.mosque) || a.name.localeCompare(b.name));
  }

  async create(dto: CreateFuneralTransportDto) {
    const entity = this.transports.create({
      name: dto.name,
      mosqueId: dto.mosqueId,
      location: dto.location,
      phone: normalizePhone(dto.phone),
      isActive: dto.isActive ?? true,
    });
    const names = await this.mosqueNames([dto.mosqueId]);
    return this.toDto(await this.transports.save(entity), names);
  }

  async update(id: string, dto: UpdateFuneralTransportDto) {
    const entity = await this.transports.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Transport not found');

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.mosqueId !== undefined) entity.mosqueId = dto.mosqueId;
    if (dto.location !== undefined) entity.location = dto.location;
    if (dto.phone !== undefined) entity.phone = normalizePhone(dto.phone);
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;

    const names = await this.mosqueNames([entity.mosqueId]);
    return this.toDto(await this.transports.save(entity), names);
  }

  async remove(id: string) {
    const entity = await this.transports.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Transport not found');
    await this.transports.softRemove(entity);
    return { id, deleted: true };
  }

  private async mosqueNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await this.mosques.find({ where: { id: In(unique) }, select: ['id', 'name'] });
    return new Map(rows.map((m) => [m.id, m.name]));
  }

  private toDto(t: FuneralTransport, mosqueNames: Map<string, string>) {
    return {
      id: t.id,
      name: t.name,
      mosqueId: t.mosqueId,
      mosque: mosqueNames.get(t.mosqueId) ?? '',
      location: t.location,
      phone: t.phone,
      isActive: t.isActive,
    };
  }
}

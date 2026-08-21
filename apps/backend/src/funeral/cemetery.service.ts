import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cemetery } from './entities/cemetery.entity';
import { CreateCemeteryDto } from './dto/create-cemetery.dto';
import { UpdateCemeteryDto } from './dto/update-cemetery.dto';

@Injectable()
export class CemeteryService {
  constructor(
    @InjectRepository(Cemetery)
    private readonly cemeteries: Repository<Cemetery>,
  ) {}

  async findAll() {
    const rows = await this.cemeteries.find({ order: { name: 'ASC' } });
    return rows.map((c) => this.toDto(c));
  }

  async create(dto: CreateCemeteryDto) {
    const cap = dto.capacity;
    const entity = this.cemeteries.create({
      name: dto.name,
      address: dto.address,
      capacity: cap,
      used: Math.min(cap, Math.max(0, dto.used ?? 0)),
      contactPerson: dto.contactPerson ?? null,
      phone: dto.phone ?? null,
      gpsLat: dto.lat != null ? String(dto.lat) : null,
      gpsLng: dto.lng != null ? String(dto.lng) : null,
    });
    return this.toDto(await this.cemeteries.save(entity));
  }

  async update(id: string, dto: UpdateCemeteryDto) {
    const entity = await this.cemeteries.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Cemetery not found');

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.address !== undefined) entity.address = dto.address;
    if (dto.capacity !== undefined) entity.capacity = dto.capacity;
    if (dto.used !== undefined) entity.used = dto.used;
    if (dto.contactPerson !== undefined) entity.contactPerson = dto.contactPerson || null;
    if (dto.phone !== undefined) entity.phone = dto.phone || null;
    if (dto.lat !== undefined) entity.gpsLat = dto.lat != null ? String(dto.lat) : null;
    if (dto.lng !== undefined) entity.gpsLng = dto.lng != null ? String(dto.lng) : null;
    // Keep occupancy coherent.
    entity.used = Math.min(entity.capacity, Math.max(0, entity.used));

    return this.toDto(await this.cemeteries.save(entity));
  }

  async remove(id: string) {
    const entity = await this.cemeteries.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Cemetery not found');
    await this.cemeteries.softRemove(entity);
    return { id, deleted: true };
  }

  /** Map an entity to the frontend Cemetery shape (camelCase + numeric coords). */
  private toDto(c: Cemetery) {
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      capacity: c.capacity,
      used: c.used,
      contactPerson: c.contactPerson ?? '',
      phone: c.phone ?? '',
      lat: c.gpsLat != null ? Number(c.gpsLat) : undefined,
      lng: c.gpsLng != null ? Number(c.gpsLng) : undefined,
    };
  }
}

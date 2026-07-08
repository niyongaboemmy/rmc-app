import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuneralAnnouncement } from './entities/funeral-announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(FuneralAnnouncement)
    private readonly announcements: Repository<FuneralAnnouncement>,
  ) {}

  /** All announcements, most recent prayer time first. */
  async findAll() {
    const rows = await this.announcements.find({ order: { prayerTime: 'DESC' } });
    return rows.map((a) => this.toDto(a));
  }

  async create(dto: CreateAnnouncementDto) {
    const entity = this.announcements.create({
      name: dto.name,
      age: dto.age ?? 0,
      dateOfDeath: dto.dateOfDeath || null,
      janazahLocation: dto.janazahLocation,
      prayerTime: new Date(dto.prayerTime),
      burialLocation: dto.burialLocation,
      verse: dto.verse || null,
      photoUrl: dto.photoUrl || null,
    });
    return this.toDto(await this.announcements.save(entity));
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const entity = await this.announcements.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Announcement not found');

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.age !== undefined) entity.age = dto.age;
    if (dto.dateOfDeath !== undefined) entity.dateOfDeath = dto.dateOfDeath || null;
    if (dto.janazahLocation !== undefined) entity.janazahLocation = dto.janazahLocation;
    if (dto.prayerTime !== undefined) entity.prayerTime = new Date(dto.prayerTime);
    if (dto.burialLocation !== undefined) entity.burialLocation = dto.burialLocation;
    if (dto.verse !== undefined) entity.verse = dto.verse || null;
    if (dto.photoUrl !== undefined) entity.photoUrl = dto.photoUrl || null;

    return this.toDto(await this.announcements.save(entity));
  }

  async remove(id: string) {
    const entity = await this.announcements.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Announcement not found');
    await this.announcements.softRemove(entity);
    return { id, deleted: true };
  }

  private toDto(a: FuneralAnnouncement) {
    return {
      id: a.id,
      name: a.name,
      age: a.age,
      dateOfDeath: a.dateOfDeath ?? '',
      janazahLocation: a.janazahLocation,
      prayerTime: new Date(a.prayerTime).toISOString(),
      burialLocation: a.burialLocation,
      verse: a.verse ?? undefined,
      photoUrl: a.photoUrl ?? undefined,
    };
  }
}

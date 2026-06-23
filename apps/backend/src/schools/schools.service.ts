import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School, SchoolStatus } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
  ) {}

  /** Active schools for the public directory/map. */
  listPublic(): Promise<School[]> {
    return this.schools.find({
      where: { status: SchoolStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  /** All schools (any status) for the admin manager. */
  adminList(): Promise<School[]> {
    return this.schools.find({ order: { name: 'ASC' } });
  }

  create(dto: CreateSchoolDto): Promise<School> {
    const school = this.schools.create({
      ...dto,
      status: dto.status ?? SchoolStatus.ACTIVE,
    });
    return this.schools.save(school);
  }

  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    const school = await this.schools.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    Object.assign(school, dto);
    return this.schools.save(school);
  }

  async remove(id: string): Promise<{ id: string }> {
    const school = await this.schools.findOne({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    await this.schools.remove(school);
    return { id };
  }
}

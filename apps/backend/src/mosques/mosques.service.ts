import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Mosque } from './entities/mosque.entity';
import { MosqueImam } from './entities/mosque-imam.entity';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import { AssignImamDto } from './dto/assign-imam.dto';

@Injectable()
export class MosquesService {
  constructor(
    @InjectRepository(Mosque) private mosques: Repository<Mosque>,
    @InjectRepository(MosqueImam) private imams: Repository<MosqueImam>,
  ) {}

  async create(dto: CreateMosqueDto): Promise<Mosque> {
    if (dto.parentMosqueId) {
      const parent = await this.mosques.findOne({ where: { id: dto.parentMosqueId } });
      if (!parent) throw new BadRequestException('Parent mosque not found');
    }
    const mosque = this.mosques.create(dto);
    return this.mosques.save(mosque);
  }

  findAll(districtId?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (districtId) where['districtId'] = districtId;
    if (status) where['status'] = status;
    return this.mosques.find({ where, order: { name: 'ASC' } });
  }

  findRootMosques() {
    return this.mosques.find({
      where: { parentMosqueId: IsNull(), status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async findBranches(parentId: string) {
    await this.findById(parentId);
    return this.mosques.find({ where: { parentMosqueId: parentId }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Mosque> {
    const mosque = await this.mosques.findOne({ where: { id } });
    if (!mosque) throw new NotFoundException('Mosque not found');
    return mosque;
  }

  async update(id: string, dto: Partial<CreateMosqueDto>): Promise<Mosque> {
    const mosque = await this.findById(id);
    Object.assign(mosque, dto);
    return this.mosques.save(mosque);
  }

  async remove(id: string): Promise<void> {
    const mosque = await this.findById(id);
    mosque.status = 'inactive';
    await this.mosques.save(mosque);
  }

  async assignImam(mosqueId: string, dto: AssignImamDto): Promise<MosqueImam> {
    await this.findById(mosqueId);
    if (dto.isPrimary) {
      await this.imams.update({ mosqueId, isPrimary: true }, { isPrimary: false });
    }
    const imam = this.imams.create({ mosqueId, ...dto });
    return this.imams.save(imam);
  }

  getImams(mosqueId: string) {
    return this.imams.find({ where: { mosqueId }, order: { startDate: 'DESC' } });
  }

  getStatistics() {
    return this.mosques.count({ where: { status: 'active' } });
  }
}

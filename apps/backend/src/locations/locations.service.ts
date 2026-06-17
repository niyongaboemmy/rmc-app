import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';
import { Sector } from './entities/sector.entity';
import { Area } from './entities/area.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Province) private provinces: Repository<Province>,
    @InjectRepository(District) private districts: Repository<District>,
    @InjectRepository(Sector) private sectors: Repository<Sector>,
    @InjectRepository(Area) private areas: Repository<Area>,
  ) {}

  findAllProvinces() {
    return this.provinces.find({ order: { name: 'ASC' } });
  }

  findAllDistricts(provinceId?: string) {
    const where = provinceId ? { provinceId } : {};
    return this.districts.find({ where, order: { name: 'ASC' } });
  }

  findAllSectors(districtId?: string) {
    const where = districtId ? { districtId } : {};
    return this.sectors.find({ where, order: { name: 'ASC' } });
  }

  findAllAreas(districtId?: string) {
    const where = districtId ? { districtId } : {};
    return this.areas.find({ where, order: { name: 'ASC' } });
  }

  async findProvinceById(id: string) {
    const province = await this.provinces.findOne({ where: { id } });
    if (!province) throw new NotFoundException('Province not found');
    return province;
  }

  async findDistrictById(id: string) {
    const district = await this.districts.findOne({ where: { id } });
    if (!district) throw new NotFoundException('District not found');
    return district;
  }
}

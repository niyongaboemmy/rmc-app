import { Repository } from 'typeorm';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';
import { Sector } from './entities/sector.entity';
import { Area } from './entities/area.entity';
export declare class LocationsService {
    private provinces;
    private districts;
    private sectors;
    private areas;
    constructor(provinces: Repository<Province>, districts: Repository<District>, sectors: Repository<Sector>, areas: Repository<Area>);
    findAllProvinces(): Promise<Province[]>;
    findAllDistricts(provinceId?: string): Promise<District[]>;
    findAllSectors(districtId?: string): Promise<Sector[]>;
    findAllAreas(districtId?: string): Promise<Area[]>;
    findProvinceById(id: string): Promise<Province>;
    findDistrictById(id: string): Promise<District>;
}

import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    findProvinces(): Promise<import("./entities/province.entity").Province[]>;
    findDistricts(provinceId?: string): Promise<import("./entities/district.entity").District[]>;
    findSectors(districtId?: string): Promise<import("./entities/sector.entity").Sector[]>;
    findAreas(districtId?: string): Promise<import("./entities/area.entity").Area[]>;
}

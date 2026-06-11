import { Sector } from './sector.entity';
import { District } from './district.entity';
export declare class Area {
    id: string;
    name: string;
    sectorId: string | null;
    districtId: string | null;
    sector: Sector | null;
    district: District | null;
}

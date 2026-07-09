import { SchoolLevel, SchoolStatus } from '../entities/school.entity';
export declare class CreateSchoolDto {
    name: string;
    level: SchoolLevel;
    principalName?: string;
    phone?: string;
    email?: string;
    district?: string;
    provinceCode?: string;
    gpsLat?: number;
    gpsLng?: number;
    status?: SchoolStatus;
}

import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
export declare class SchoolsAdminController {
    private readonly service;
    constructor(service: SchoolsService);
    list(): Promise<import("./entities/school.entity").School[]>;
    create(dto: CreateSchoolDto): Promise<import("./entities/school.entity").School>;
    update(id: string, dto: UpdateSchoolDto): Promise<import("./entities/school.entity").School>;
    remove(id: string): Promise<{
        id: string;
    }>;
}

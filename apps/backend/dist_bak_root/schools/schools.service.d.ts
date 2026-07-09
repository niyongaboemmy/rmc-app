import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
export declare class SchoolsService {
    private readonly schools;
    constructor(schools: Repository<School>);
    listPublic(): Promise<School[]>;
    adminList(): Promise<School[]>;
    create(dto: CreateSchoolDto): Promise<School>;
    update(id: string, dto: UpdateSchoolDto): Promise<School>;
    remove(id: string): Promise<{
        id: string;
    }>;
}

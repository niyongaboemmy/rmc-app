import { Repository } from 'typeorm';
import { Mosque } from './entities/mosque.entity';
import { MosqueImam } from './entities/mosque-imam.entity';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import { AssignImamDto } from './dto/assign-imam.dto';
export declare class MosquesService {
    private mosques;
    private imams;
    constructor(mosques: Repository<Mosque>, imams: Repository<MosqueImam>);
    create(dto: CreateMosqueDto): Promise<Mosque>;
    findAll(districtId?: string, status?: string): Promise<Mosque[]>;
    findRootMosques(): Promise<Mosque[]>;
    findBranches(parentId: string): Promise<Mosque[]>;
    findById(id: string): Promise<Mosque>;
    update(id: string, dto: Partial<CreateMosqueDto>): Promise<Mosque>;
    remove(id: string): Promise<void>;
    assignImam(mosqueId: string, dto: AssignImamDto): Promise<MosqueImam>;
    getImams(mosqueId: string): Promise<MosqueImam[]>;
    getStatistics(): Promise<number>;
}

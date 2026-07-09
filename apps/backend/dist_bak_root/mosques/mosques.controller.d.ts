import { MosquesService } from './mosques.service';
import { CreateMosqueDto } from './dto/create-mosque.dto';
import { AssignImamDto } from './dto/assign-imam.dto';
export declare class MosquesController {
    private readonly mosques;
    constructor(mosques: MosquesService);
    findAll(districtId?: string, status?: string): Promise<import("./entities/mosque.entity").Mosque[]>;
    findRoots(): Promise<import("./entities/mosque.entity").Mosque[]>;
    findOne(id: string): Promise<import("./entities/mosque.entity").Mosque>;
    getBranches(id: string): Promise<import("./entities/mosque.entity").Mosque[]>;
    getImams(id: string): Promise<import("./entities/mosque-imam.entity").MosqueImam[]>;
    create(dto: CreateMosqueDto): Promise<import("./entities/mosque.entity").Mosque>;
    update(id: string, dto: CreateMosqueDto): Promise<import("./entities/mosque.entity").Mosque>;
    remove(id: string): Promise<void>;
    assignImam(id: string, dto: AssignImamDto): Promise<import("./entities/mosque-imam.entity").MosqueImam>;
}

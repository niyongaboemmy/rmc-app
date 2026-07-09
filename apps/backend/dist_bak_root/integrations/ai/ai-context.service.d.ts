import { Repository } from 'typeorm';
import { Mosque } from '../../mosques/entities/mosque.entity';
export declare class AiContextService {
    private readonly mosques;
    private readonly logger;
    private cache;
    constructor(mosques: Repository<Mosque>);
    isMosqueQuery(message: string): boolean;
    getMosqueDirectory(): Promise<string>;
}

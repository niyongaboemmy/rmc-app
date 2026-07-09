import { Repository } from 'typeorm';
import { MarriageTransaction } from '../marriage/entities/marriage-transaction.entity';
import { MarriageApplication } from '../marriage/entities/marriage-application.entity';
export declare class MarriageWebhookService {
    private readonly txRepo;
    private readonly appRepo;
    private readonly logger;
    constructor(txRepo: Repository<MarriageTransaction>, appRepo: Repository<MarriageApplication>);
    handleCallback(payload: Record<string, string>): Promise<void>;
}

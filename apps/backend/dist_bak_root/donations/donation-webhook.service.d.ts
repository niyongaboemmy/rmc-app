import { Repository } from 'typeorm';
import { Donation } from './entities/donation.entity';
import { SmsService } from '../integrations/sms/sms.service';
export declare class DonationWebhookService {
    private readonly repo;
    private readonly smsService;
    private readonly logger;
    constructor(repo: Repository<Donation>, smsService: SmsService);
    handleCallback(payload: Record<string, string>): Promise<void>;
}

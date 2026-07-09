import { Repository } from 'typeorm';
import { SmsConfigService } from './sms-config.service';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsSendOptions, SmsSendResult } from './sms.types';
export declare class SmsService {
    private readonly smsConfig;
    private readonly historyRepo;
    private readonly logger;
    constructor(smsConfig: SmsConfigService, historyRepo: Repository<SmsMessage>);
    send(options: SmsSendOptions): Promise<SmsSendResult>;
    sendSms(to: string, message: string): Promise<void>;
    sendBulk(options: Omit<SmsSendOptions, 'to'> & {
        to: string[];
    }): Promise<SmsSendResult>;
    private callIntouchApi;
    private parseApiResponse;
    private parseSentAt;
    private consoleFallback;
    private failResult;
    private resolveRecipients;
    private normalizePhone;
    private isValidPhone;
    private validateMessage;
    private sanitizeSender;
    private saveHistory;
    private sleep;
}

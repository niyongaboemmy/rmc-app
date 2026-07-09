import { SmsConfigService } from './sms-config.service';
import { SmsService } from './sms.service';
import { UpdateSmsConfigDto } from './dto/update-sms-config.dto';
import { TestSmsDto } from './dto/test-sms.dto';
export declare class SmsConfigAdminController {
    private readonly smsConfig;
    private readonly sms;
    constructor(smsConfig: SmsConfigService, sms: SmsService);
    getConfig(): Promise<Omit<import("./entities/sms-config.entity").SmsConfig, "passwordEnc"> & {
        passwordSet: boolean;
        password: string;
    }>;
    updateConfig(dto: UpdateSmsConfigDto): Promise<{
        message: string;
    }>;
    activate(): Promise<{
        message: string;
    }>;
    deactivate(): Promise<{
        message: string;
    }>;
    refreshCache(): Promise<{
        message: string;
    }>;
    getHistory(page?: string, limit?: string): Promise<{
        data: import("./entities/sms-message.entity").SmsMessage[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    testSms(dto: TestSmsDto): Promise<{
        success: boolean;
        provider: import("./sms.types").SmsProvider;
        recipients: string[];
        details: import("./sms.types").SmsRecipientDetail[];
        summary: import("./sms.types").SmsSendSummary | null;
        error: string | null;
    }>;
}

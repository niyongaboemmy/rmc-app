import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SmsConfig } from './entities/sms-config.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { UpdateSmsConfigDto } from './dto/update-sms-config.dto';
export interface ResolvedSmsConfig {
    username: string;
    password: string;
    senderName: string;
    dlrUrl: string | null;
    isActive: boolean;
}
export declare class SmsConfigService implements OnModuleInit {
    private readonly repo;
    private readonly historyRepo;
    private readonly appConfig;
    private readonly logger;
    private cachedConfig;
    constructor(repo: Repository<SmsConfig>, historyRepo: Repository<SmsMessage>, appConfig: ConfigService);
    onModuleInit(): Promise<void>;
    getActiveConfig(): Promise<ResolvedSmsConfig | null>;
    getForAdmin(): Promise<Omit<SmsConfig, 'passwordEnc'> & {
        passwordSet: boolean;
        password: string;
    }>;
    update(dto: UpdateSmsConfigDto): Promise<void>;
    setActive(active: boolean): Promise<void>;
    updateBalance(balanceRwf: number): Promise<void>;
    refreshCache(): Promise<void>;
    invalidateCache(): void;
    getHistory(page: number, limit: number): Promise<{
        data: SmsMessage[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    private findRow;
    private encryptionKey;
    private sanitizeSender;
    private defaultDlrUrl;
}

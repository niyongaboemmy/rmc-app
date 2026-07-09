import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiSettings } from './entities/ai-settings.entity';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
export type AiProvider = 'gemini' | 'openai';
export interface ResolvedAiConfig {
    provider: AiProvider;
    apiKey: string;
    model: string;
}
export interface AdminAiSettings {
    defaultProvider: AiProvider;
    openaiModel: string;
    geminiModel: string;
    isActive: boolean;
    openaiKeySet: boolean;
    geminiKeySet: boolean;
    openaiKeyHint: string;
    geminiKeyHint: string;
}
export declare class AiSettingsService implements OnModuleInit {
    private readonly repo;
    private readonly appConfig;
    private readonly logger;
    private cached;
    private cacheLoaded;
    constructor(repo: Repository<AiSettings>, appConfig: ConfigService);
    onModuleInit(): Promise<void>;
    getActiveConfig(): Promise<ResolvedAiConfig | null>;
    getForAdmin(): Promise<AdminAiSettings>;
    update(dto: UpdateAiSettingsDto, updatedBy: string | null): Promise<void>;
    setActive(active: boolean): Promise<void>;
    refreshCache(): Promise<void>;
    invalidateCache(): void;
    private resolveKeyUpdate;
    private keyHint;
    private findRow;
    private encryptionKey;
}

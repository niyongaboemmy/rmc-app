import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
export declare class AiSettingsAdminController {
    private readonly aiSettings;
    constructor(aiSettings: AiSettingsService);
    getConfig(): Promise<import("./ai-settings.service").AdminAiSettings>;
    updateConfig(dto: UpdateAiSettingsDto, userId: string): Promise<{
        message: string;
    }>;
    activate(): Promise<{
        message: string;
    }>;
    deactivate(): Promise<{
        message: string;
    }>;
}

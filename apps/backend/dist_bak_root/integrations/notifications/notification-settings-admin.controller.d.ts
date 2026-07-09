import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
export declare class NotificationSettingsAdminController {
    private readonly service;
    constructor(service: NotificationSettingsService);
    getAll(): Promise<import("./entities/notification-setting.entity").NotificationSetting[]>;
    updateMany(dto: UpdateNotificationSettingsDto): Promise<{
        message: string;
    }>;
    refreshCache(): Promise<{
        message: string;
    }>;
}

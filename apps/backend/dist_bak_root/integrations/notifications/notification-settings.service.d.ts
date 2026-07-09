import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationSetting } from './entities/notification-setting.entity';
export type NotificationChannel = 'email' | 'sms';
export declare class NotificationSettingsService implements OnModuleInit {
    private readonly repo;
    private readonly logger;
    private cache;
    constructor(repo: Repository<NotificationSetting>);
    onModuleInit(): Promise<void>;
    isEmailEnabled(eventKey: string): boolean;
    isSmsEnabled(eventKey: string): boolean;
    isChannelEnabled(eventKey: string, channel: NotificationChannel): boolean;
    getAll(): Promise<NotificationSetting[]>;
    updateOne(eventKey: string, patch: {
        emailEnabled?: boolean;
        smsEnabled?: boolean;
    }): Promise<NotificationSetting>;
    updateMany(updates: Array<{
        eventKey: string;
        emailEnabled?: boolean;
        smsEnabled?: boolean;
    }>): Promise<void>;
    refreshCache(): Promise<void>;
}

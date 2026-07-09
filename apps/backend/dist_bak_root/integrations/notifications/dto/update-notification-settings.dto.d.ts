export declare class UpdateOneNotificationSettingDto {
    eventKey: string;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
}
export declare class UpdateNotificationSettingsDto {
    updates: UpdateOneNotificationSettingDto[];
}

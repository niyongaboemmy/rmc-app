export type NotificationGroup = 'Authentication' | 'Marriage Service';
export declare class NotificationSetting {
    id: string;
    eventKey: string;
    label: string;
    description: string | null;
    groupName: string;
    emailApplicable: boolean;
    smsApplicable: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

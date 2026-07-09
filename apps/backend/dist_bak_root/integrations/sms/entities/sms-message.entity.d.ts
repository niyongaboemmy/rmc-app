export declare class SmsMessage {
    id: string;
    recipients: string[];
    message: string;
    sender: string | null;
    provider: string;
    success: boolean;
    totalMessages: number | null;
    cost: number | null;
    balanceAfter: number | null;
    error: string | null;
    details: object | null;
    sentAt: Date | null;
    createdAt: Date;
}

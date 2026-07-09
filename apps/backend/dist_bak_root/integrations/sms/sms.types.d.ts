export type SmsProvider = 'intouch' | 'console';
export type DlrStatus = 'P' | 'D' | 'Q' | 'E' | 'S' | 'U';
export declare const DLR_STATUS_DESCRIPTIONS: Record<DlrStatus, string>;
export interface SmsSendOptions {
    to: string | string[];
    message: string;
    sender?: string;
    dlrUrl?: string;
}
export interface SmsRecipientDetail {
    status: DlrStatus;
    message: string;
    cost: number;
    recipient: string;
    messageId: number;
}
export interface SmsSendSummary {
    totalMessages: number;
    cost: number;
    balance: number;
    sentAt: string;
}
export interface SmsSendResult {
    success: boolean;
    provider: SmsProvider | 'console';
    recipients: string[];
    details: SmsRecipientDetail[];
    summary?: SmsSendSummary;
    error?: string;
}
export interface IntouchApiResponse {
    success: boolean;
    details: Array<{
        status: string;
        message: string;
        cost: number;
        receipient: string;
        messageid: number;
    }>;
    summary: {
        message: string;
        balance: number | string;
        cost?: number;
        totalmessages: number;
        time: string;
    };
}
export interface DlrCallbackParams {
    messageid: string;
    status: DlrStatus;
}

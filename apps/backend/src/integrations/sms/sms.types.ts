export type SmsProvider = 'intouch' | 'console';

export type DlrStatus = 'P' | 'D' | 'Q' | 'E' | 'S' | 'U';

export const DLR_STATUS_DESCRIPTIONS: Record<DlrStatus, string> = {
  P: 'Message being Processed',
  D: 'Message Delivered',
  Q: 'Message Queued',
  E: 'Message Errored',
  S: 'Message Sent',
  U: 'Message Undelivered',
};

export interface SmsSendOptions {
  /** One or more recipient phone numbers (Rwanda local or E.164 format). */
  to: string | string[];
  /** SMS body text. */
  message: string;
  /** Sender ID (alpha-numeric, max 11 chars). Falls back to INTOUCH_SENDER env. */
  sender?: string;
  /** Override the delivery report callback URL. Falls back to INTOUCH_DLR_URL env. */
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

/** Raw shape returned by the InTouch HTTP API. */
export interface IntouchApiResponse {
  success: boolean;
  details: Array<{
    status: string;
    message: string;
    cost: number;
    receipient: string; // API typo — "receipient" not "recipient"
    messageid: number;
  }>;
  summary: {
    message: string;
    balance: number | string; // InTouch returns "3,697" (string with comma) or a number
    cost?: number; // Not always present — derive from details if missing
    totalmessages: number;
    time: string; // Format: "20260624232933" (YYYYMMDDHHmmss)
  };
}

/** Query parameters sent by InTouch to your DLR callback endpoint. */
export interface DlrCallbackParams {
  messageid: string;
  status: DlrStatus;
}

import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SmsConfig {
  id: string;
  username: string;
  password: string;
  passwordSet: boolean;
  senderName: string;
  dlrUrl: string | null;
  isActive: boolean;
  balanceRwf: string | null;
  balanceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSmsConfigPayload {
  username: string;
  password: string;
  senderName?: string;
  dlrUrl?: string;
  isActive?: boolean;
}

export interface SmsRecipientDetail {
  status: 'P' | 'D' | 'Q' | 'E' | 'S' | 'U';
  message: string;
  cost: number;
  recipient: string;
  messageId: number;
}

export interface TestSmsResult {
  success: boolean;
  provider: string;
  recipients: string[];
  details: SmsRecipientDetail[];
  summary: {
    totalMessages: number;
    cost: number;
    balance: number;
    sentAt: string;
  } | null;
  error: string | null;
}

export interface SmsHistoryItem {
  id: string;
  recipients: string[];
  message: string;
  sender: string | null;
  provider: string;
  success: boolean;
  totalMessages: number | null;
  cost: string | null;
  balanceAfter: string | null;
  error: string | null;
  details: SmsRecipientDetail[] | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationSetting {
  id: string;
  eventKey: string;
  label: string;
  description: string | null;
  groupName: string;
  emailApplicable: boolean;
  smsApplicable: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface UpdateNotificationSettingsPayload {
  updates: Array<{
    eventKey: string;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
  }>;
}

export interface SmsHistoryPage {
  data: SmsHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const settingsApi = {
  getSmsConfig(): Promise<SmsConfig> {
    return apiClient.get('/admin/system/sms-config').then((r) => r.data.data ?? r.data);
  },

  updateSmsConfig(payload: UpdateSmsConfigPayload): Promise<{ message: string }> {
    return apiClient.patch('/admin/system/sms-config', payload).then((r) => r.data.data ?? r.data);
  },

  activateSms(): Promise<{ message: string }> {
    return apiClient.post('/admin/system/sms-config/activate').then((r) => r.data.data ?? r.data);
  },

  deactivateSms(): Promise<{ message: string }> {
    return apiClient.post('/admin/system/sms-config/deactivate').then((r) => r.data.data ?? r.data);
  },

  refreshSmsCache(): Promise<{ message: string }> {
    return apiClient.post('/admin/system/sms-config/refresh-cache').then((r) => r.data.data ?? r.data);
  },

  testSms(phone: string, message: string): Promise<TestSmsResult> {
    return apiClient
      .post('/admin/system/sms-config/test', { phone, message })
      .then((r) => r.data.data ?? r.data);
  },

  getSmsHistory(page = 1, limit = 20): Promise<SmsHistoryPage> {
    return apiClient
      .get(`/admin/system/sms-config/history?page=${page}&limit=${limit}`)
      .then((r) => r.data.data ?? r.data);
  },

  getNotificationSettings(): Promise<NotificationSetting[]> {
    return apiClient
      .get('/admin/system/notification-settings')
      .then((r) => r.data.data ?? r.data);
  },

  updateNotificationSettings(payload: UpdateNotificationSettingsPayload): Promise<{ message: string }> {
    return apiClient
      .patch('/admin/system/notification-settings', payload)
      .then((r) => r.data.data ?? r.data);
  },
};

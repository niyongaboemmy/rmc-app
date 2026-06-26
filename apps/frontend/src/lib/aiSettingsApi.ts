import { apiClient } from './api';

export type AiProvider = 'gemini' | 'openai';

/** Masked AI settings returned to the admin UI (raw keys are never sent). */
export interface AiSettings {
  defaultProvider: AiProvider;
  openaiModel: string;
  geminiModel: string;
  isActive: boolean;
  openaiKeySet: boolean;
  geminiKeySet: boolean;
  openaiKeyHint: string;
  geminiKeyHint: string;
}

export interface UpdateAiSettingsPayload {
  defaultProvider?: AiProvider;
  /** Send a value to replace, "" to clear, omit/"_KEEP_" to leave unchanged. */
  openaiKey?: string;
  geminiKey?: string;
  openaiModel?: string;
  geminiModel?: string;
  isActive?: boolean;
}

export const aiSettingsApi = {
  getSettings(): Promise<AiSettings> {
    return apiClient.get('/admin/system/ai-settings').then((r) => r.data.data ?? r.data);
  },

  updateSettings(payload: UpdateAiSettingsPayload): Promise<{ message: string }> {
    return apiClient.patch('/admin/system/ai-settings', payload).then((r) => r.data.data ?? r.data);
  },

  activate(): Promise<{ message: string }> {
    return apiClient.post('/admin/system/ai-settings/activate').then((r) => r.data.data ?? r.data);
  },

  deactivate(): Promise<{ message: string }> {
    return apiClient.post('/admin/system/ai-settings/deactivate').then((r) => r.data.data ?? r.data);
  },
};

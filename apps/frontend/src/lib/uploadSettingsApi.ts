import { apiClient } from './api';

export interface UploadSettings {
  id: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  createdAt: string;
  updatedAt: string;
}

const BASE = '/upload-settings';

export const uploadSettingsApi = {
  get(): Promise<UploadSettings> {
    return apiClient.get<{ data: UploadSettings }>(BASE).then((r) => r.data.data);
  },

  updateMaxFileSize(maxFileSize: number): Promise<UploadSettings> {
    return apiClient.patch<{ data: UploadSettings }>(BASE, { maxFileSize }).then((r) => r.data.data);
  },

  addMimeType(mimeType: string): Promise<UploadSettings> {
    return apiClient
      .post<{ data: UploadSettings }>(`${BASE}/mime-types`, { mimeType })
      .then((r) => r.data.data);
  },

  removeMimeType(mimeType: string): Promise<UploadSettings> {
    return apiClient
      .delete<{ data: UploadSettings }>(`${BASE}/mime-types/${encodeURIComponent(mimeType)}`)
      .then((r) => r.data.data);
  },
};

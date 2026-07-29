import axios from 'axios';
import { API_BASE_URL, apiClient } from './api';

/**
 * RMC history timeline entries (the "RMC Through the Years" section on /about).
 *
 * Reads are PUBLIC; writes go through the authenticated apiClient (the backend
 * gates create/update/delete on content:create / content:edit / content:delete).
 * The section's HEADER (title/subtitle) is NOT here — it lives in the `about`
 * site_content blob, edited inline through the About board.
 */

const publicHttp = axios.create({ baseURL: API_BASE_URL });

function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  return p.then((res) => {
    const body = res.data as { data?: T };
    return (body?.data ?? res.data) as T;
  });
}

export interface HistoryEntry {
  id: string;
  year: number;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  descriptionEn: string;
  descriptionRw: string;
  descriptionAr: string;
  imageKey: string | null;
  sortOrder: number;
}

/** Fields accepted on create/update; all optional on update. */
export interface HistoryEntryInput {
  year?: number;
  titleEn?: string;
  titleRw?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  imageKey?: string | null;
  sortOrder?: number;
}

export const historyApi = {
  list: (): Promise<HistoryEntry[]> =>
    unwrap<HistoryEntry[]>(publicHttp.get('/content/history/entries')).then((v) =>
      Array.isArray(v) ? v : [],
    ),

  create: (dto: HistoryEntryInput): Promise<HistoryEntry> =>
    unwrap(apiClient.post('/content/history/entries', dto)),

  update: (id: string, dto: HistoryEntryInput): Promise<HistoryEntry> =>
    unwrap(apiClient.put(`/content/history/entries/${id}`, dto)),

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/content/history/entries/${id}`);
  },
};

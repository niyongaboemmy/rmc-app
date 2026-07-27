import { apiClient } from './api';

/**
 * Admin client for the "Verse of the Day" schedule.
 *
 * Verses live in the `verses_of_day` table and are exposed via the Public
 * module. The homepage shows the verse whose `displayDate` is today
 * (`GET /public/verse-of-day`); these admin endpoints manage the full schedule.
 * Mirrors the announcements/gallery admin API conventions.
 */

export interface VerseOfDay {
  id: string;
  /** Qur'an surah number (1–114). */
  surah: number;
  /** Ayah number within the surah. */
  ayah: number;
  arabicText: string;
  translationEn: string;
  translationRw: string | null;
  reference: string;
  /** ISO date (YYYY-MM-DD) this verse is shown on the homepage. Unique. */
  displayDate: string;
  createdBy?: string | null;
  createdAt?: string;
}

/** Fields a client may set when creating/editing a verse. */
export interface VerseInput {
  surah: number;
  ayah: number;
  arabicText: string;
  translationEn: string;
  translationRw: string | null;
  reference: string;
  displayDate: string;
}

// API responses are enveloped as { data: <payload> } by the backend interceptor.
function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  return p.then((r) => r.data.data);
}

export const verseOfDayApi = {
  /** Full schedule, newest display date first. */
  adminGetAll: () =>
    unwrap<VerseOfDay[]>(apiClient.get('/public/verse-of-day/admin-all')),

  create: (dto: VerseInput) =>
    unwrap<VerseOfDay>(apiClient.post('/public/verse-of-day', dto)),

  update: (id: string, dto: Partial<VerseInput>) =>
    unwrap<VerseOfDay>(apiClient.put(`/public/verse-of-day/${id}`, dto)),

  delete: (id: string) =>
    apiClient.delete(`/public/verse-of-day/${id}`).then(() => undefined),
};

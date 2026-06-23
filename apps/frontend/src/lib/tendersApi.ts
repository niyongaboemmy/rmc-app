import { apiClient, FILE_SERVER_URL, refreshAccessToken } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenderI18n {
  en: string;
  rw: string;
  ar: string;
}

export interface TenderAttachment {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface Tender {
  id: string;
  /** Plain-text fallback (EN canonical). */
  title: string;
  content: string;
  /** Multilingual versions — use these when available. */
  titleI18n: TenderI18n | null;
  contentI18n: TenderI18n | null;
  priority: 'normal' | 'high' | 'urgent';
  publishAt: string;
  expiresAt: string | null;
  isPublished: boolean;
  type: 'tender';
  attachments: TenderAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenderDto {
  title: string;
  content: string;
  titleI18n: TenderI18n;
  contentI18n: TenderI18n;
  priority: 'normal' | 'high' | 'urgent';
  publishAt: string;
  expiresAt?: string | null;
  isPublished: boolean;
  attachments: TenderAttachment[];
}

/** Pick the best available text for a given locale. */
export function resolveI18n(
  i18n: TenderI18n | null | undefined,
  fallback: string,
  locale: string,
): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof TenderI18n] || i18n.en || fallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  return p.then((r) => r.data.data);
}

class UploadHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function sendFileUpload(
  file: File,
  folder: string,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; size: number; mimeType: string; originalName: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${FILE_SERVER_URL}/api/v1/upload?folder=${folder}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve(body.data ?? body);
        } catch {
          reject(new UploadHttpError(xhr.status, 'Unexpected response from file server'));
        }
      } else {
        let detail = '';
        try { detail = JSON.parse(xhr.responseText)?.error?.message ?? ''; } catch { /* noop */ }
        reject(new UploadHttpError(xhr.status, `Upload failed — HTTP ${xhr.status}${detail ? ': ' + detail : ''}`));
      }
    };

    xhr.onerror = () => reject(new UploadHttpError(0, 'Network error'));
    xhr.ontimeout = () => reject(new UploadHttpError(0, 'Upload timed out'));
    xhr.timeout = 120_000;

    xhr.send(form);
  });
}

/**
 * Upload a single file (PDF or image) to the tenders folder.
 * Returns a TenderAttachment descriptor ready to store in the DB.
 */
export async function uploadTenderFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<TenderAttachment> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;

  try {
    const result = await sendFileUpload(file, 'tenders', token, onProgress);
    return { key: result.key, name: file.name, mimeType: file.type, size: file.size };
  } catch (err) {
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        const result = await sendFileUpload(file, 'tenders', fresh, onProgress);
        return { key: result.key, name: file.name, mimeType: file.type, size: file.size };
      }
    }
    throw err;
  }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export const tendersApi = {
  adminGetAll: (limit = 100) =>
    unwrap<Tender[]>(
      apiClient.get('/public/announcements/admin-all', { params: { type: 'tender', limit } }),
    ),

  getById: (id: string) =>
    unwrap<Tender>(apiClient.get(`/public/announcements/${id}`)),

  create: (dto: CreateTenderDto) =>
    unwrap<Tender>(apiClient.post('/public/announcements', { ...dto, type: 'tender' })),

  update: (id: string, dto: Partial<CreateTenderDto>) =>
    unwrap<Tender>(apiClient.put(`/public/announcements/${id}`, dto)),

  delete: (id: string) =>
    apiClient.delete(`/public/announcements/${id}`).then(() => undefined),
};

import { FILE_SERVER_URL, fileUrl, refreshAccessToken } from './api';

/**
 * Generic media upload to the file-server, mirroring the gallery's hardened
 * XHR + token-refresh flow. Returns the stored file key. Used by admin content
 * editors that let staff replace media (e.g. the "How to Become a Muslim" intro
 * video). The file-server enforces the allowed MIME types and size limit.
 */

class UploadHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function send(
  file: File,
  folder: string,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${FILE_SERVER_URL}/api/v1/upload?folder=${folder}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve((body.data ?? body).key as string);
        } catch {
          reject(new UploadHttpError(xhr.status, 'Unexpected response from file server'));
        }
      } else {
        let detail = '';
        try { detail = JSON.parse(xhr.responseText)?.error?.message ?? ''; } catch { /* noop */ }
        reject(new UploadHttpError(xhr.status, `Upload failed — HTTP ${xhr.status}${detail ? ': ' + detail : ''}`));
      }
    };
    xhr.onerror = () => reject(new UploadHttpError(0, 'Network error — could not reach file server'));
    xhr.ontimeout = () => reject(new UploadHttpError(0, 'Upload timed out'));
    xhr.timeout = 180_000; // 3 min ceiling for larger video files
    xhr.send(form);
  });
}

/** Upload any file (image/video/…) to a folder; refreshes the token once on 401. */
export async function uploadMedia(
  file: File,
  folder = 'content',
  onProgress?: (pct: number) => void,
): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  try {
    return await send(file, folder, token, onProgress);
  } catch (err) {
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return send(file, folder, fresh, onProgress);
    }
    throw err;
  }
}

/**
 * Resolve a stored media value to a usable src. Accepts an absolute URL, a
 * root-relative path (e.g. `/logo.webp`), or a bare file-server key. Empty in →
 * empty out.
 */
export function resolveMediaUrl(value: string | undefined | null): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  return fileUrl(value);
}

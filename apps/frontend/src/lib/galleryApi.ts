import { apiClient, FILE_SERVER_URL, refreshAccessToken } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  fileKey: string;
  thumbnailKey: string | null;
  mediumKey: string | null;
  fileType: string;
  category: string | null;
  uploadedBy: string;
  isPublic: boolean;
  createdAt: string;
}

export interface GalleryPage {
  data: GalleryItem[];
  total: number;
  page: number;
  pages: number;
}

export interface ImageVersions {
  thumbnail: Blob;
  medium: Blob;
  original: Blob;
}

// ── Image processing (browser Canvas API) ────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      quality,
    );
  });
}

async function resizeToCanvas(img: HTMLImageElement, maxWidth: number): Promise<HTMLCanvasElement> {
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Max widths per version. Original capped at 1920 so full-res photos (12-24MP)
// never produce files that exceed the 10 MB multer limit or stall the connection.
const VERSION_CONFIG = {
  thumbnail: { maxWidth: 400,  quality: 0.55 },
  medium:    { maxWidth: 900,  quality: 0.78 },
  original:  { maxWidth: 1920, quality: 0.92 },
} as const;

export async function generateImageVersions(file: File): Promise<ImageVersions> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = url;
    });

    // Process each version sequentially to keep peak memory low on large images
    const thumbCanvas = await resizeToCanvas(img, VERSION_CONFIG.thumbnail.maxWidth);
    const thumbnail   = await canvasToBlob(thumbCanvas, VERSION_CONFIG.thumbnail.quality);

    const medCanvas = await resizeToCanvas(img, VERSION_CONFIG.medium.maxWidth);
    const medium    = await canvasToBlob(medCanvas, VERSION_CONFIG.medium.quality);

    const origCanvas = await resizeToCanvas(img, VERSION_CONFIG.original.maxWidth);
    const original   = await canvasToBlob(origCanvas, VERSION_CONFIG.original.quality);

    return { thumbnail, medium, original };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── File upload (native XHR — same mechanism as the working marriage wizard) ──

// canvas.toBlob() returns a Blob whose data may still be backed by the
// browser's internal canvas renderer.  When XHR tries to stream that Blob
// across a cross-origin socket, some Chromium builds abort mid-read, which
// manifests as ECONNRESET on the server.  Calling blob.arrayBuffer() first
// eagerly copies all bytes into a plain JS ArrayBuffer so the new Blob we
// hand to XHR is always backed by stable heap memory.
async function materialize(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  return new Blob([buf], { type: blob.type });
}

// Error carrying the HTTP status so callers can react to it (e.g. 401 → refresh).
class UploadHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function sendUpload(
  stableBlob: Blob,
  filename: string,
  folder: string,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    // Append as a named File so multer sees the correct filename + Content-Type
    form.append('file', new File([stableBlob], filename, { type: 'image/jpeg' }));

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
          const key = (body.data ?? body).key as string;
          resolve(key);
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
    xhr.timeout = 120_000; // 2 min ceiling for large originals

    xhr.send(form);
  });
}

async function uploadBlob(
  blob: Blob,
  filename: string,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const stableBlob = await materialize(blob);
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;

  try {
    return await sendUpload(stableBlob, filename, folder, token, onProgress);
  } catch (err) {
    // Raw XHR bypasses the apiClient interceptor, so an expired access token
    // (15-min lifetime) 401s here. Refresh once and retry before giving up.
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return sendUpload(stableBlob, filename, folder, fresh, onProgress);
    }
    throw err;
  }
}

export interface UploadGalleryImageOptions {
  versions: ImageVersions;
  onProgress?: (stage: 'thumbnail' | 'medium' | 'original', pct: number) => void;
  onStageDone?: (stage: 'thumbnail' | 'medium' | 'original') => void;
}

export async function uploadGalleryVersions(opts: UploadGalleryImageOptions): Promise<{
  thumbnailKey: string;
  mediumKey: string;
  fileKey: string;
}> {
  const base = `gallery-${Date.now()}`;

  // Sequential uploads — avoids ECONNRESET from simultaneous large multipart connections
  const thumbnailKey = await uploadBlob(
    opts.versions.thumbnail, `${base}-thumb.jpg`, 'gallery',
    (p) => opts.onProgress?.('thumbnail', p),
  );
  opts.onStageDone?.('thumbnail');

  const mediumKey = await uploadBlob(
    opts.versions.medium, `${base}-medium.jpg`, 'gallery',
    (p) => opts.onProgress?.('medium', p),
  );
  opts.onStageDone?.('medium');

  const fileKey = await uploadBlob(
    opts.versions.original, `${base}-original.jpg`, 'gallery',
    (p) => opts.onProgress?.('original', p),
  );
  opts.onStageDone?.('original');

  return { thumbnailKey, mediumKey, fileKey };
}

/**
 * Upload a single image file directly to the file server without resizing.
 * Returns the file-server key (e.g. "areas/uuid.jpg").
 */
export async function uploadAreaImage(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const stableBlob = await materialize(file);
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  try {
    return await sendUpload(stableBlob, file.name, folder, token, onProgress);
  } catch (err) {
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return sendUpload(stableBlob, file.name, folder, fresh, onProgress);
    }
    throw err;
  }
}

// ── Gallery CRUD API ──────────────────────────────────────────────────────────

function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  return p.then((r) => r.data.data);
}

export const galleryApi = {
  adminGetAll: (category?: string, page = 1) =>
    unwrap<GalleryPage>(
      apiClient.get('/public/gallery/admin-all', { params: { category, page } }),
    ),

  create: (payload: {
    title?: string;
    description?: string;
    fileKey: string;
    thumbnailKey?: string;
    mediumKey?: string;
    fileType?: string;
    category?: string;
    isPublic?: boolean;
  }) => unwrap<GalleryItem>(apiClient.post('/public/gallery', payload)),

  update: (id: string, payload: Partial<{
    title: string | null;
    description: string | null;
    category: string | null;
    isPublic: boolean;
  }>) => unwrap<GalleryItem>(apiClient.put(`/public/gallery/${id}`, payload)),

  delete: (id: string) =>
    apiClient.delete(`/public/gallery/${id}`).then(() => undefined),
};

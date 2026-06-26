'use client';

import { useRef, useState, useCallback } from 'react';
import { FILE_SERVER_URL, refreshAccessToken } from '@/lib/api';

interface AvatarUploaderProps {
  currentUrl?: string | null;
  initials?: string;
  onUploaded: (url: string) => void;
  size?: number;        // px, default 96
  disabled?: boolean;
}

/** Resize an image file to a square JPEG Blob using the Canvas API. */
async function resizeToSquare(file: File, px: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img');
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });

  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx   = (img.naturalWidth  - size) / 2;
  const sy   = (img.naturalHeight - size) / 2;

  const canvas     = document.createElement('canvas');
  canvas.width     = px;
  canvas.height    = px;
  const ctx        = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, px, px);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.88,
    );
  });
}

/** Upload a Blob to the file server. Returns the stored file key. */
async function uploadToFileServer(blob: Blob, filename: string): Promise<string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;

  const send = (tok: string | null) =>
    new Promise<string>((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', blob, filename);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${FILE_SERVER_URL}/api/v1/upload?folder=avatars`);
      if (tok) xhr.setRequestHeader('Authorization', `Bearer ${tok}`);

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const json = JSON.parse(xhr.responseText) as { data?: { key?: string }; key?: string };
            const key  = json.data?.key ?? json.key;
            if (key) { resolve(key); return; }
          } catch { /* fall through */ }
          reject(new Error('Unexpected response'));
        } else if (xhr.status === 401) {
          reject(Object.assign(new Error('Unauthorized'), { status: 401 }));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(fd);
    });

  try {
    return await send(token);
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return send(fresh);
    }
    throw err;
  }
}

export function AvatarUploader({
  currentUrl,
  initials = '?',
  onUploaded,
  size = 96,
  disabled,
}: AvatarUploaderProps) {
  const inputRef               = useRef<HTMLInputElement>(null);
  const [preview, setPreview]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]      = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl ?? null;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be smaller than 8 MB.');
      return;
    }

    setError(null);
    setUploading(true);

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const blob = await resizeToSquare(file, 400);
      const key  = await uploadToFileServer(blob, `avatar-${Date.now()}.jpg`);
      const url  = `${FILE_SERVER_URL}/api/v1/files/${key}`;
      onUploaded(url);
      setPreview(url);   // stable URL replaces the blob URL
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setPreview(null);   // revert preview on error
      URL.revokeObjectURL(localUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUploaded]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative group cursor-pointer"
        style={{ width: size, height: size }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        role="button"
        aria-label="Change profile photo"
      >
        {/* Circle avatar */}
        <div
          className="w-full h-full rounded-full overflow-hidden ring-4 ring-white shadow-md bg-rmc-green flex items-center justify-center text-white font-bold select-none"
          style={{ fontSize: size * 0.3 }}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Hover / uploading overlay */}
        <div className={[
          'absolute inset-0 rounded-full flex flex-col items-center justify-center',
          'transition-opacity duration-200',
          uploading
            ? 'bg-black/40 opacity-100'
            : 'bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100',
          disabled ? 'cursor-not-allowed' : '',
        ].join(' ')}>
          {uploading ? (
            <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white text-[10px] font-semibold mt-0.5">Change</span>
            </>
          )}
        </div>

        {/* Camera badge */}
        {!uploading && (
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-rmc-green border-2 border-white flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />

      {error && (
        <p className="text-xs text-red-500 text-center max-w-[160px]">{error}</p>
      )}
    </div>
  );
}

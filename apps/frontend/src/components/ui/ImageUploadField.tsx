'use client';

import { useRef, useState } from 'react';
import { Upload, RefreshCw, Trash2 } from 'lucide-react';
import { generateImageVersions, uploadGalleryVersions } from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';

/**
 * Reusable image picker: generates resized versions, uploads them to the file
 * server, and stores the resolved file URL (so it can be rendered directly).
 * Shows a live preview with Replace / Remove and an uploading state.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  heightClass = 'h-40',
  compact = false,
  rounded = 'rounded-xl',
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  heightClass?: string;
  /** Icon-only Replace/Remove controls — for small preview areas where text won't fit. */
  compact?: boolean;
  /** Border-radius class for the container — e.g. 'rounded-full' for a profile-picture look. */
  rounded?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Please choose an image file.'); return; }
    setUploading(true);
    setErr('');
    try {
      const versions = await generateImageVersions(file);
      const { fileKey } = await uploadGalleryVersions({ versions });
      onChange(fileUrl(fileKey));
    } catch {
      setErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className={`relative w-full overflow-hidden ${rounded} border border-gray-200 bg-gray-50 ${heightClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2">
            {compact ? (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} title="Replace" aria-label="Replace image" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-gray-700 hover:bg-white"><RefreshCw className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => onChange('')} title="Remove" aria-label="Remove image" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-red-600 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-white">Replace</button>
                <button type="button" onClick={() => onChange('')} className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-white">Remove</button>
              </>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`flex w-full flex-col items-center justify-center gap-2 ${rounded} border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-60 ${heightClass}`}
        >
          {uploading ? (
            <><RefreshCw className="h-6 w-6 animate-spin" />{!compact && <span className="text-[12px]">Uploading…</span>}</>
          ) : (
            <><Upload className="h-6 w-6" />{!compact && <span className="text-[12px] font-semibold">Upload image</span>}</>
          )}
        </button>
      )}
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

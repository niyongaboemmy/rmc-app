'use client';

/**
 * Click-to-replace image field for in-context Edit Mode.
 *
 * A section renders this in place of its normal image only while a super-admin is
 * editing (see `PartnersSection`). It shows the current image with a hover
 * overlay to Replace or Remove it, uploads the chosen file to the file-server,
 * and reports the new key up through `onChange`. The public site never renders
 * this component — it keeps using `next/image` — so behaviour there is unchanged.
 *
 * `value` may be a `/public` path, an absolute URL or a bare file-server key;
 * `assetUrl` resolves all three for display.
 */

import React, { useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import { uploadAreaImage } from '@/lib/galleryApi';
import { useToast } from '@/components/ui/Toast';

interface InlineImageProps {
  value: string;
  onChange: (key: string) => void;
  /** File-server folder the upload lands in (e.g. "partners"). */
  folder: string;
  alt?: string;
  /** Sizing/chrome for the outer box (the image fills it). */
  className?: string;
  /** object-fit + padding for the inner image. */
  imgClassName?: string;
  /** When provided, shows a Remove action that clears the value. */
  onRemove?: () => void;
  /** Rendered when `value` is empty instead of the default placeholder box
   *  (e.g. an Areas card's branded icon tile). The Upload overlay still shows. */
  placeholder?: React.ReactNode;
}

export function InlineImage({
  value,
  onChange,
  folder,
  alt = '',
  className = '',
  imgClassName = 'object-contain',
  onRemove,
  placeholder,
}: InlineImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { success, error } = useToast();

  const openPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-picking the same file later
    setUploading(true);
    setProgress(0);
    try {
      const key = await uploadAreaImage(file, folder, setProgress);
      onChange(key);
      success('Image updated.');
    } catch {
      error('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`group/inlimg relative overflow-hidden rounded-md ring-1 ring-inset ring-rmc-green/30 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(value)} alt={alt} className={`h-full w-full ${imgClassName}`} />
      ) : (
        placeholder ?? (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
            <ImageIcon className="h-6 w-6" />
          </div>
        )
      )}

      {/* Edit overlay — appears on hover, or fills the box while uploading */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-1.5 bg-black/45 transition-opacity ${
          uploading ? 'opacity-100' : 'opacity-0 group-hover/inlimg:opacity-100'
        }`}
      >
        {uploading ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Loader2 className="h-4 w-4 animate-spin" /> {progress}%
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={openPicker}
              className="flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-800 shadow hover:bg-white"
            >
              <Upload className="h-3 w-3" /> {value ? 'Replace' : 'Upload'}
            </button>
            {onRemove && value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-red-700"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

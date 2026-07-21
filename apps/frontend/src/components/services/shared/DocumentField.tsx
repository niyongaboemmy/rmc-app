'use client';

import { useEffect, useState } from 'react';
import { FileText, Upload, X, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Shared document-upload field ────────────────────────────────────────────────
// A single, self-contained dropzone that holds one File and validates its type
// and size on the client BEFORE anything is uploaded. Reused across the service
// application forms (jobs, scholarship, tender) — the accent colour is themeable
// and all display text is passed in so each feature keeps its own translations.

export interface UploadTexts {
  uploadOrDrop: string;
  change: string;
  remove: string;
  unsupportedType: string;
  /** Receives the max size in MB, e.g. `(mb) => t('fileTooLarge', { mb })`. */
  tooLarge: (mb: number) => string;
}

const DEFAULT_TEXTS: UploadTexts = {
  uploadOrDrop: 'Upload or drop a file',
  change: 'Change',
  remove: 'Remove',
  unsupportedType: 'Unsupported file type',
  tooLarge: (mb) => `File too large (max ${mb} MB)`,
};

export type UploadAccent = 'emerald' | 'violet' | 'teal';

const ACCENTS: Record<UploadAccent, { border: string; bg: string; text: string; ring: string }> = {
  emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'hover:border-emerald-300 hover:bg-emerald-50/20' },
  violet: { border: 'border-violet-400', bg: 'bg-violet-50', text: 'text-violet-600', ring: 'hover:border-violet-300 hover:bg-violet-50/20' },
  teal: { border: 'border-teal-400', bg: 'bg-teal-50', text: 'text-teal-600', ring: 'hover:border-teal-300 hover:bg-teal-50/20' },
};

export function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Validate a file against an `accept` list (comma-separated MIME types) and a
 * max size. Returns a human-readable error string, or `null` when the file is
 * acceptable. Exported so callers (e.g. repeatable lists) can validate too.
 */
export function validateFile(
  accept: string,
  maxMb: number,
  file: File,
  texts: UploadTexts = DEFAULT_TEXTS,
): string | null {
  const allowed = accept.split(',').map((t) => t.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(file.type)) return texts.unsupportedType;
  if (file.size > maxMb * 1024 * 1024) return texts.tooLarge(maxMb);
  return null;
}

/** Create/revoke an object URL for an image file, cleaned up on change/unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

interface DocumentFieldProps {
  label: string;
  accept: string;
  maxMb: number;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  hint?: string;
  /** External error (e.g. a form-level "required" message). */
  error?: string;
  accent?: UploadAccent;
  texts?: UploadTexts;
}

export function DocumentField({
  label,
  accept,
  maxMb,
  file,
  onChange,
  required = false,
  hint,
  error,
  accent = 'emerald',
  texts = DEFAULT_TEXTS,
}: DocumentFieldProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = useObjectUrl(file);
  const a = ACCENTS[accent];

  const handleFile = (f: File) => {
    const err = validateFile(accept, maxMb, f, texts);
    setLocalError(err);
    if (!err) onChange(f);
  };

  const shownError = localError || error;
  const isImageOnly = accept.includes('image') && !accept.includes('pdf') && !accept.includes('word');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700 leading-none">{label}</span>
        {required && <span className="text-red-500 text-xs leading-none">*</span>}
        {file && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
      </div>

      <div
        className={cn(
          'rounded-xl border-2 border-dashed transition-all duration-150',
          dragOver ? `${a.border} ${a.bg}`
            : file ? 'border-green-300 bg-green-50/40'
            : `border-gray-200 bg-gray-50 ${a.ring}`,
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {file ? (
          <div className="flex items-center gap-2.5 px-3 py-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate leading-snug">{file.name}</p>
              <p className="text-[10px] text-gray-400">{fmtSize(file.size)}</p>
            </div>
            <label className={cn('text-[10px] font-semibold shrink-0 cursor-pointer', a.text)}>
              {texts.change}
              <input type="file" accept={accept} className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
            <button
              type="button"
              onClick={() => { onChange(null); setLocalError(null); }}
              aria-label={texts.remove}
              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              {isImageOnly ? <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500 text-center leading-snug px-3">
              <span className={cn('font-semibold', a.text)}>{texts.uploadOrDrop}</span>
            </p>
            {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
            <input type="file" accept={accept} className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        )}
      </div>

      {shownError && <p className="text-[10px] text-red-500">{shownError}</p>}
    </div>
  );
}

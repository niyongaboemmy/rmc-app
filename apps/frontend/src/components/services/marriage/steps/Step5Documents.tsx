'use client';

import { useEffect, useState } from 'react';
import {
  FileText, Upload, X, CheckCircle2, ArrowRight, ArrowLeft, Image as ImageIcon, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { WizardFormData } from '../MarriageWizard';

type FileSlotKey = keyof Pick<
  WizardFormData,
  'groomIdFile' | 'brideIdFile' | 'groomPhotoFile' | 'bridePhotoFile' | 'waliConsentFile' | 'portraitFile'
>;

interface FileUploadSlot {
  key: FileSlotKey;
  label: string;
  accept: string;
  maxMb: number;
  required: boolean;
  hint: string;
}

// Photos come first (they appear on the certificate), identity documents below.
const PHOTO_SLOTS: FileUploadSlot[] = [
  { key: 'groomPhotoFile', label: "Groom's photo", accept: 'image/jpeg,image/png', maxMb: 5, required: true, hint: 'Passport-style · appears on the certificate' },
  { key: 'bridePhotoFile', label: "Bride's photo", accept: 'image/jpeg,image/png', maxMb: 5, required: true, hint: 'Passport-style · appears on the certificate' },
];

const DOC_SLOTS: FileUploadSlot[] = [
  { key: 'groomIdFile',     label: "Groom's National ID",        accept: 'image/jpeg,image/png',                 maxMb: 5,  required: true,  hint: 'JPG or PNG · 5 MB' },
  { key: 'brideIdFile',     label: "Bride's National ID",        accept: 'image/jpeg,image/png',                 maxMb: 5,  required: true,  hint: 'JPG or PNG · 5 MB' },
  { key: 'waliConsentFile', label: 'Wali consent letter',        accept: 'application/pdf,image/jpeg,image/png', maxMb: 10, required: false, hint: 'PDF, JPG or PNG · 10 MB' },
  { key: 'portraitFile',    label: 'Couple portrait (optional)', accept: 'image/jpeg,image/png',                 maxMb: 5,  required: false, hint: 'Optional · JPG or PNG · 5 MB' },
];

const ALL_SLOTS = [...PHOTO_SLOTS, ...DOC_SLOTS];

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function validate(slot: FileUploadSlot, f: File): string | null {
  if (!slot.accept.split(',').map((t) => t.trim()).includes(f.type)) return 'Unsupported file type';
  if (f.size > slot.maxMb * 1024 * 1024) return `File too large (max ${slot.maxMb} MB)`;
  return null;
}

/** Create/revoke an object URL for an image file, cleaned up on change/unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

interface DropZoneProps {
  slot: FileUploadSlot;
  file: File | null;
  onChange: (file: File | null) => void;
}

function Label({ slot, file }: { slot: FileUploadSlot; file: File | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-gray-700 leading-none">{slot.label}</span>
      {slot.required && <span className="text-rose-500 text-xs leading-none">*</span>}
      {file && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
    </div>
  );
}

/** Large, prominent dropzone for the groom/bride photos. */
function PhotoDropZone({ slot, file, onChange }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = useObjectUrl(file);

  const handleFile = (f: File) => {
    const err = validate(slot, f);
    setError(err);
    if (!err) onChange(f);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label slot={slot} file={file} />
      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-150',
          dragOver ? 'border-rose-400 bg-rose-50'
            : file ? 'border-green-300 bg-green-50/30'
            : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/20',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {file && preview ? (
          <>
            <div className="h-56 w-full bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={slot.label} className="max-h-full max-w-full object-contain" />
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove photo"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center text-gray-600 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <label className="flex items-center gap-2 px-3 py-2 bg-white border-t border-green-100 cursor-pointer">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs font-medium text-gray-900 truncate flex-1">{file.name}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{fmtSize(file.size)}</span>
              <span className="text-[10px] font-medium text-rose-600 shrink-0">Change</span>
              <input type="file" accept={slot.accept} className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 h-56 cursor-pointer text-center px-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <Camera className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-sm text-gray-600">
              <span className="text-rose-600 font-semibold">Upload</span> or drop a photo
            </p>
            <p className="text-[11px] text-gray-400">{slot.hint}</p>
            <input type="file" accept={slot.accept} className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

/** Compact dropzone for identity documents / other files. */
function FileDropZone({ slot, file, onChange }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = useObjectUrl(file);

  const handleFile = (f: File) => {
    const err = validate(slot, f);
    setError(err);
    if (!err) onChange(f);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label slot={slot} file={file} />
      <div
        className={cn(
          'rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer',
          dragOver ? 'border-rose-400 bg-rose-50'
            : file ? 'border-green-300 bg-green-50/40'
            : 'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/20',
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
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove file"
              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              {slot.accept.includes('image') && !slot.accept.includes('pdf')
                ? <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                : <Upload className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500 text-center leading-snug">
              <span className="text-rose-600 font-medium">Upload</span> or drop
            </p>
            <p className="text-[10px] text-gray-400">{slot.hint}</p>
            <input type="file" accept={slot.accept} className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{children}</p>;
}

interface Props {
  initialData: Partial<WizardFormData>;
  onNext: (data: Partial<WizardFormData>) => void;
  onBack: () => void;
}

export function Step5Documents({ initialData, onNext, onBack }: Props) {
  const [files, setFiles] = useState<Partial<Record<FileSlotKey, File | null>>>({
    groomPhotoFile:  initialData.groomPhotoFile  ?? null,
    bridePhotoFile:  initialData.bridePhotoFile  ?? null,
    groomIdFile:     initialData.groomIdFile     ?? null,
    brideIdFile:     initialData.brideIdFile     ?? null,
    waliConsentFile: initialData.waliConsentFile ?? null,
    portraitFile:    initialData.portraitFile    ?? null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const setFile = (key: FileSlotKey, f: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: f }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = ALL_SLOTS.filter((s) => s.required && !files[s.key]);
    if (missing.length) {
      setFormError(`Required: ${missing.map((s) => s.label).join(', ')}`);
      return;
    }
    setFormError(null);
    onNext(files as Partial<WizardFormData>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs text-gray-400">
        Clear, readable photos only. Fields marked <span className="text-rose-500">*</span> are required.
      </p>

      {/* Couple photos — shown on the certificate */}
      <div className="space-y-3">
        <SectionHeading>Couple photos</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PHOTO_SLOTS.map((slot) => (
            <PhotoDropZone
              key={slot.key}
              slot={slot}
              file={files[slot.key] ?? null}
              onChange={(f) => setFile(slot.key, f)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* Identity & other documents */}
      <div className="space-y-3">
        <SectionHeading>Identity &amp; documents</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          {DOC_SLOTS.map((slot) => (
            <FileDropZone
              key={slot.key}
              slot={slot}
              file={files[slot.key] ?? null}
              onChange={(f) => setFile(slot.key, f)}
            />
          ))}
        </div>
      </div>

      {formError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {formError}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="!bg-rose-600 hover:!bg-rose-700 !text-white !shadow-none"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}

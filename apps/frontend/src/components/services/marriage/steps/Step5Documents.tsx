'use client';

import { useState } from 'react';
import { FileText, Upload, X, CheckCircle2, ArrowRight, ArrowLeft, Image } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { WizardFormData } from '../MarriageWizard';

interface FileUploadSlot {
  key: keyof Pick<WizardFormData, 'groomIdFile' | 'brideIdFile' | 'waliConsentFile' | 'portraitFile'>;
  label: string;
  accept: string;
  maxMb: number;
  required: boolean;
  hint: string;
}

const SLOTS: FileUploadSlot[] = [
  { key: 'groomIdFile',     label: "Groom's National ID",        accept: 'image/jpeg,image/png',                    maxMb: 5,  required: true,  hint: 'JPG or PNG · 5 MB' },
  { key: 'brideIdFile',     label: "Bride's National ID",        accept: 'image/jpeg,image/png',                    maxMb: 5,  required: true,  hint: 'JPG or PNG · 5 MB' },
  { key: 'waliConsentFile', label: 'Wali consent letter',        accept: 'application/pdf,image/jpeg,image/png',    maxMb: 10, required: false, hint: 'PDF, JPG or PNG · 10 MB' },
  { key: 'portraitFile',    label: 'Portrait (for certificate)', accept: 'image/jpeg,image/png',                    maxMb: 5,  required: true,  hint: 'Passport-style · 5 MB' },
];

interface DropZoneProps {
  slot: FileUploadSlot;
  file: File | null;
  onChange: (file: File | null) => void;
}

function DropZone({ slot, file, onChange }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  const validate = (f: File): string | null => {
    if (!slot.accept.split(',').map((t) => t.trim()).includes(f.type)) return 'Unsupported type';
    if (f.size > slot.maxMb * 1024 * 1024) return `Max ${slot.maxMb} MB`;
    return null;
  };

  const handleFile = (f: File) => {
    const err = validate(f);
    setError(err);
    if (!err) onChange(f);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700 leading-none">{slot.label}</span>
        {slot.required && <span className="text-rose-500 text-xs leading-none">*</span>}
        {file && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer',
          dragOver   ? 'border-rose-400 bg-rose-50'      :
          file       ? 'border-green-300 bg-green-50/40' :
                       'border-gray-200 bg-gray-50 hover:border-rose-300 hover:bg-rose-50/20',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {file ? (
          /* ── Filled state ── */
          <div className="flex items-center gap-2.5 px-3 py-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate leading-snug">{file.name}</p>
              <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* ── Empty state ── */
          <label className="flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              {slot.accept.includes('image') && !slot.accept.includes('pdf')
                ? <Image className="w-3.5 h-3.5 text-gray-400" />
                : <Upload className="w-3.5 h-3.5 text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500 text-center leading-snug">
              <span className="text-rose-600 font-medium">Upload</span> or drop
            </p>
            <p className="text-[10px] text-gray-400">{slot.hint}</p>
            <input
              type="file"
              accept={slot.accept}
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
        )}
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

interface Props {
  initialData: Partial<WizardFormData>;
  onNext: (data: Partial<WizardFormData>) => void;
  onBack: () => void;
}

export function Step5Documents({ initialData, onNext, onBack }: Props) {
  const [files, setFiles] = useState<
    Partial<Record<keyof Pick<WizardFormData, 'groomIdFile' | 'brideIdFile' | 'waliConsentFile' | 'portraitFile'>, File | null>>
  >({
    groomIdFile:     initialData.groomIdFile     ?? null,
    brideIdFile:     initialData.brideIdFile     ?? null,
    waliConsentFile: initialData.waliConsentFile ?? null,
    portraitFile:    initialData.portraitFile    ?? null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = SLOTS.filter((s) => s.required && !files[s.key]);
    if (missing.length) {
      setFormError(`Required: ${missing.map((s) => s.label).join(', ')}`);
      return;
    }
    setFormError(null);
    onNext(files as Partial<WizardFormData>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-xs text-gray-400">
        Clear, readable photos only. Fields marked <span className="text-rose-500">*</span> are required.
      </p>

      {/* 2 × 2 grid — halves scroll on desktop */}
      <div className="grid grid-cols-2 gap-4">
        {SLOTS.map((slot) => (
          <DropZone
            key={slot.key}
            slot={slot}
            file={files[slot.key] ?? null}
            onChange={(f) => setFiles((prev) => ({ ...prev, [slot.key]: f }))}
          />
        ))}
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

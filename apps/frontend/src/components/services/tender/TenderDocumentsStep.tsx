'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FilePreviewTrigger } from '@/components/ui/FilePreviewOverlay';
import { cn } from '@/lib/utils';
import {
  uploadBidDocument,
  REQUIRED_DOCUMENTS,
  MAX_DOCUMENT_MB,
  ACCEPTED_DOCUMENT_MIMES,
  type TenderDocumentType,
  type TenderDocumentPayload,
} from '@/lib/tenderApplicationApi';

const ACCEPT_ATTR = ACCEPTED_DOCUMENT_MIMES.join(',');

/**
 * One upload slot's lifecycle. `payload` is only set once the file-server has
 * accepted the file and returned a storage key — the bid can't be submitted
 * until all three slots hold one, so a half-finished upload can never be
 * silently posted as a complete application.
 */
type SlotState =
  | { phase: 'empty' }
  | { phase: 'uploading'; fileName: string; pct: number }
  | { phase: 'done'; payload: TenderDocumentPayload }
  | { phase: 'error'; message: string };

type SlotMap = Record<TenderDocumentType, SlotState>;

const EMPTY_SLOTS: SlotMap = {
  rdb_certificate: { phase: 'empty' },
  tax_clearance: { phase: 'empty' },
  proposal: { phase: 'empty' },
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

interface Props {
  /** Documents already attached to the bid being edited — pre-seeds the slots as done. */
  initialDocuments?: TenderDocumentPayload[];
  submitting: boolean;
  onBack: () => void;
  onSubmit: (documents: TenderDocumentPayload[]) => void;
}

export function TenderDocumentsStep({
  initialDocuments,
  submitting,
  onBack,
  onSubmit,
}: Props) {
  const t = useTranslations('services.tender.apply');

  // Seeded lazily rather than in an effect: an effect would run a render *after*
  // the slots were locked in empty, briefly showing an edited bid as having no
  // documents (and letting the user submit an incomplete one in that gap).
  const [slots, setSlots] = useState<SlotMap>(() => {
    if (!initialDocuments?.length) return EMPTY_SLOTS;
    const seeded = { ...EMPTY_SLOTS };
    for (const doc of initialDocuments) {
      seeded[doc.docType] = { phase: 'done', payload: doc };
    }
    return seeded;
  });
  const [formError, setFormError] = useState<string | null>(null);

  // The files as picked in this session, kept alongside the upload payloads so
  // the bidder can re-open what they attached. A bid being EDITED seeds its
  // slots from documents already on the server, which we hold no File for —
  // those simply offer no preview rather than a broken one.
  const [picked, setPicked] = useState<Partial<Record<TenderDocumentType, File>>>({});

  const setSlot = (docType: TenderDocumentType, state: SlotState) =>
    setSlots((prev) => ({ ...prev, [docType]: state }));

  const clearSlot = (docType: TenderDocumentType) => {
    setSlot(docType, { phase: 'empty' });
    setPicked((prev) => ({ ...prev, [docType]: undefined }));
  };

  const handleFile = async (docType: TenderDocumentType, file: File) => {
    if (!ACCEPTED_DOCUMENT_MIMES.includes(file.type)) {
      setSlot(docType, { phase: 'error', message: t('docs.errorType') });
      return;
    }
    if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) {
      setSlot(docType, {
        phase: 'error',
        message: t('docs.errorSize', { max: MAX_DOCUMENT_MB }),
      });
      return;
    }

    setSlot(docType, { phase: 'uploading', fileName: file.name, pct: 0 });
    try {
      const payload = await uploadBidDocument(file, docType, (pct) =>
        setSlot(docType, { phase: 'uploading', fileName: file.name, pct }),
      );
      setSlot(docType, { phase: 'done', payload });
      setPicked((prev) => ({ ...prev, [docType]: file }));
      setFormError(null);
    } catch {
      setSlot(docType, { phase: 'error', message: t('docs.errorUpload') });
      setPicked((prev) => ({ ...prev, [docType]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const documents = REQUIRED_DOCUMENTS.map((type) => slots[type]).filter(
      (s): s is Extract<SlotState, { phase: 'done' }> => s.phase === 'done',
    );

    if (documents.length < REQUIRED_DOCUMENTS.length) {
      setFormError(t('docs.errorMissing'));
      return;
    }
    setFormError(null);
    onSubmit(documents.map((s) => s.payload));
  };

  const uploading = REQUIRED_DOCUMENTS.some((type) => slots[type].phase === 'uploading');

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5"
    >
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-rmc-green" /> {t('step3Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step3Subtitle')}</p>
      </div>

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((docType) => (
          <DocumentSlot
            key={docType}
            docType={docType}
            state={slots[docType]}
            pickedFile={picked[docType] ?? null}
            onFile={(file) => handleFile(docType, file)}
            onClear={() => clearSlot(docType)}
          />
        ))}
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3"
        >
          {formError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          {t('back')}
        </Button>
        <Button
          type="submit"
          isLoading={submitting}
          disabled={uploading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}

function DocumentSlot({
  docType,
  state,
  pickedFile,
  onFile,
  onClear,
}: {
  docType: TenderDocumentType;
  state: SlotState;
  /** The File as picked this session; null for a slot seeded from a saved bid. */
  pickedFile: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const t = useTranslations('services.tender.apply');
  const [dragOver, setDragOver] = useState(false);

  // A drag that ends outside the browser never fires `dragleave`, which would
  // leave the zone stuck in its highlighted state — reset on any global drop.
  useEffect(() => {
    const reset = () => setDragOver(false);
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">{t(`docs.${docType}.label`)}</span>
        <span className="text-red-500 text-sm leading-none">*</span>
        {state.phase === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
      </div>

      <div
        className={cn(
          'rounded-lg border-2 border-dashed transition-all duration-150',
          dragOver
            ? 'border-rmc-green bg-rmc-green-light'
            : state.phase === 'done'
              ? 'border-green-300 bg-green-50/40'
              : state.phase === 'error'
                ? 'border-red-300 bg-red-50/40'
                : 'border-gray-200 bg-gray-50 hover:border-rmc-green hover:bg-rmc-green-light/20',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        {state.phase === 'uploading' && (
          <div className="flex items-center gap-3 px-4 py-4">
            <Loader2 className="w-5 h-5 text-rmc-green animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{state.fileName}</p>
              <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-rmc-green transition-all duration-200"
                  style={{ width: `${state.pct}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{state.pct}%</span>
          </div>
        )}

        {state.phase === 'done' && (
          <div className="flex items-center gap-3 px-4 py-3">
            <FilePreviewTrigger file={pickedFile} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0 cursor-zoom-in hover:bg-green-200 transition-colors">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </FilePreviewTrigger>
            {!pickedFile && (
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate leading-snug">
                {state.payload.fileName}
              </p>
              <p className="text-[10px] text-gray-400">{fmtSize(state.payload.fileSize)}</p>
            </div>
            <FilePreviewTrigger
              file={pickedFile}
              className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-rmc-green hover:border-gray-300 shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
            </FilePreviewTrigger>
            <button
              type="button"
              onClick={onClear}
              aria-label={t('docs.remove')}
              className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {(state.phase === 'empty' || state.phase === 'error') && (
          <label className="flex flex-col items-center justify-center gap-1.5 py-6 cursor-pointer text-center px-4">
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <Upload className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">
              <span className="text-rmc-green font-semibold">{t('docs.upload')}</span>{' '}
              {t('docs.orDrop')}
            </p>
            <p className="text-[10px] text-gray-400">
              {t('docs.hint', { max: MAX_DOCUMENT_MB })}
            </p>
            <input
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                // Clear the input so re-picking the same file after an error still fires `change`.
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      {state.phase === 'error' && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {state.message}
        </p>
      )}
      {state.phase !== 'error' && (
        <p className="text-[11px] text-gray-400">{t(`docs.${docType}.hint`)}</p>
      )}
    </div>
  );
}

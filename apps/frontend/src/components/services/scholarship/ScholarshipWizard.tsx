'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight, ArrowLeft, User, GraduationCap, Users, Check,
  CheckCircle2, Copy, Search, Upload, FileText, X, MessageSquareText, ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/lib/mediaUpload';
import {
  scholarshipApi,
  type CreateScholarshipApplicationPayload,
  type ScholarshipApplication,
  type ScholarshipDocumentType,
} from '@/lib/scholarshipApi';

// Attachments: PDFs and images, up to 10 MB each (matches the file-server limit).
const DOC_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const DOC_MAX_BYTES = 10 * 1024 * 1024;

// Local Rwandan mobile format the user types: 0 + network prefix (72/73/78/79) + 7 digits.
const PHONE_RE = /^07[2389][0-9]{7}$/;

// Per-question limits. The three questions + program/course + income are combined
// into the backend's single `motivation` field, which still validates at ≤1000
// chars (unchanged). The two required questions always fit; the optional tail is
// clamped defensively in buildMotivation so submission can never fail validation.
const WHY_MAX = 500;
const HOW_MAX = 300;
const ELSE_MAX = 200;
const PROGRAM_MAX = 60;
const INCOME_MAX = 30;

/** +250781234567 (backend/API format) → 0781234567 (what the user sees/types). */
function toLocalPhone(e164: string): string {
  return e164?.startsWith('+250') ? `0${e164.slice(4)}` : e164;
}

/** 0781234567 (what the user types) → +250781234567 (backend/API format). */
function toE164Phone(local: string): string {
  return local?.startsWith('0') ? `+250${local.slice(1)}` : local;
}

/**
 * Fold the three scholarship questions plus program/course and household income
 * into the single `motivation` text column (the backend is unchanged). Required
 * answers come first so the defensive 1000-char clamp only ever trims the optional
 * tail. Labels are kept in English for consistent reviewing in the admin panel.
 */
function buildMotivation(
  whyDeserve: string,
  howHelp: string,
  anythingElse: string,
  programCourse: string,
  householdIncome: string,
): string {
  let out =
    `Why I deserve this scholarship:\n${whyDeserve.trim()}` +
    `\n\nHow this scholarship will help me:\n${howHelp.trim()}`;
  if (anythingElse.trim()) out += `\n\nAdditional information:\n${anythingElse.trim()}`;
  if (programCourse.trim()) out += `\n\nProgram / Course: ${programCourse.trim()}`;
  if (householdIncome.trim()) out += `\nMonthly household income: ${householdIncome.trim()}`;
  return out.slice(0, 1000);
}

// ─── Document slots ──────────────────────────────────────────────────────────────
// Six named slots. The backend's ScholarshipDocumentType enum only allows four
// values (unchanged), so slots reuse them; the real file names preserve specifics.

type DocSlotKey =
  | 'transcript'
  | 'reportCard'
  | 'studentId'
  | 'recommendation'
  | 'certificates'
  | 'financial';

const SLOT_DOCTYPE: Record<DocSlotKey, ScholarshipDocumentType> = {
  transcript: 'transcript',
  reportCard: 'academic_record',
  studentId: 'additional',
  recommendation: 'additional',
  certificates: 'additional',
  financial: 'proof',
};

type DocFiles = Record<DocSlotKey, File | null>;
const EMPTY_FILES: DocFiles = {
  transcript: null,
  reportCard: null,
  studentId: null,
  recommendation: null,
  certificates: null,
  financial: null,
};

// ─── Schemas ─────────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  fullNames: z.string().min(3, 'tooShort').max(150, 'tooLong'),
  studentId: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('invalidEmail').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_RE, 'phoneFormat'),
});
type Step1Data = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  schoolName: z.string().min(2, 'tooShort').max(200, 'tooLong'),
  currentYear: z.string().min(1, 'required').max(50, 'tooLong'),
  programCourse: z.string().min(1, 'required').max(PROGRAM_MAX, 'tooLong'),
  averageGrade: z.string().max(20).optional().or(z.literal('')),
});
type Step2Data = z.infer<typeof step2Schema>;

const step3Schema = z.object({
  whyDeserve: z.string().min(10, 'tooShort').max(WHY_MAX, 'tooLong'),
  howHelp: z.string().min(10, 'tooShort').max(HOW_MAX, 'tooLong'),
  anythingElse: z.string().max(ELSE_MAX, 'tooLong').optional().or(z.literal('')),
});
type Step3Data = z.infer<typeof step3Schema>;

const step4Schema = z.object({
  guardianName: z.string().min(3, 'tooShort').max(150, 'tooLong'),
  guardianPhone: z.string().regex(PHONE_RE, 'phoneFormat'),
  householdIncome: z.string().max(INCOME_MAX).optional().or(z.literal('')),
});
type Step4Data = z.infer<typeof step4Schema>;

type WizardPhase = 1 | 2 | 3 | 4 | 'success';

interface Props {
  /** When editing a draft application, pre-fills the form and calls updateDraft instead of createDraft. */
  editRequest?: ScholarshipApplication;
  /** Retained for route compatibility; the program picker was removed from the form. */
  initialProgramId?: string;
}

// ─── Shared 4-step progress header ─────────────────────────────────────────────

function WizardProgress({ phase, t }: { phase: WizardPhase; t: ReturnType<typeof useTranslations> }) {
  const steps: { key: 1 | 2 | 3 | 4; label: string }[] = [
    { key: 1, label: t('step1Title') },
    { key: 2, label: t('step2Title') },
    { key: 3, label: t('step3Title') },
    { key: 4, label: t('step4Title') },
  ];
  const order: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const currentIndex = phase === 'success' ? order.length : order.indexOf(phase as 1 | 2 | 3 | 4);

  return (
    <div className="flex items-center gap-2 sm:gap-3" role="list" aria-label={t('step1Title')}>
      {steps.map(({ key, label }, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={key} className="flex items-center gap-2 flex-1" role="listitem">
            <span
              aria-current={active ? 'step' : undefined}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                active
                  ? 'bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md'
                  : done
                    ? 'bg-rmc-green text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${active ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${done ? 'bg-rmc-green' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ScholarshipWizard({ editRequest }: Props) {
  const t = useTranslations('services.scholarship.apply');
  const { locale } = useParams<{ locale: string }>();

  // Lazily seeded from `editRequest` (never a post-mount effect) — react-hook-form
  // only reads `defaultValues` once, at mount. For edited drafts the combined
  // `motivation` blob is placed back into the primary question; the secondary
  // answers can't be losslessly split out, which is acceptable for the rare
  // draft-edit path.
  const [phase, setPhase] = useState<WizardPhase>(1);
  const [step1Data, setStep1Data] = useState<Partial<Step1Data>>(() =>
    editRequest
      ? {
          fullNames: editRequest.fullNames,
          studentId: editRequest.nationalId ?? '',
          email: editRequest.email ?? '',
          phone: toLocalPhone(editRequest.phone),
        }
      : {},
  );
  const [step2Data, setStep2Data] = useState<Partial<Step2Data>>(() =>
    editRequest
      ? {
          schoolName: editRequest.schoolName,
          currentYear: editRequest.currentYear,
          programCourse: '',
          averageGrade: editRequest.averageGrade ?? '',
        }
      : {},
  );
  const [step3Data, setStep3Data] = useState<Partial<Step3Data>>(() =>
    editRequest ? { whyDeserve: editRequest.motivation, howHelp: '', anythingElse: '' } : {},
  );
  const [step4Data, setStep4Data] = useState<Partial<Step4Data>>(() =>
    editRequest
      ? {
          guardianName: editRequest.guardianName,
          guardianPhone: toLocalPhone(editRequest.guardianPhone),
          householdIncome: '',
        }
      : {},
  );
  const [files, setFiles] = useState<DocFiles>(EMPTY_FILES);
  const [declaration, setDeclaration] = useState(false);

  const [request, setRequest] = useState<ScholarshipApplication | null>(editRequest ?? null);
  // Once a draft is created we keep its id so a retry (e.g. after a failed
  // document upload) updates the existing draft instead of creating a second one.
  const [draftId, setDraftId] = useState<string | null>(editRequest?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setFile = (key: DocSlotKey, f: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: f }));

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateScholarshipApplicationPayload = {
        // Personal
        fullNames: step1Data.fullNames!,
        nationalId: step1Data.studentId || undefined, // Student ID reuses the nationalId column
        email: step1Data.email || undefined,
        phone: toE164Phone(step1Data.phone!),
        // Academic
        schoolName: step2Data.schoolName!,
        currentYear: step2Data.currentYear!,
        averageGrade: step2Data.averageGrade || undefined,
        // Guardian
        guardianName: step4Data.guardianName!,
        guardianPhone: toE164Phone(step4Data.guardianPhone!),
        // Questions + program/course + income folded into the single motivation column
        motivation: buildMotivation(
          step3Data.whyDeserve ?? '',
          step3Data.howHelp ?? '',
          step3Data.anythingElse ?? '',
          step2Data.programCourse ?? '',
          step4Data.householdIncome ?? '',
        ),
        // Fixed defaults for the two enums the new form no longer surfaces, so the
        // unchanged backend validation still passes.
        educationLevel: 'university',
        relationship: 'guardian',
      };

      // Reuse an already-created draft on retry; otherwise create one.
      const saved = draftId
        ? await scholarshipApi.updateDraft(draftId, payload)
        : await scholarshipApi.createDraft(payload);
      setDraftId(saved.id);

      // Upload each attached document, then record it against the draft.
      const uploads = (Object.keys(files) as DocSlotKey[])
        .map((key) => ({ key, file: files[key] }))
        .filter((s): s is { key: DocSlotKey; file: File } => s.file !== null);

      const failed: string[] = [];
      for (const { key, file } of uploads) {
        try {
          const fileKey = await uploadMedia(file, 'scholarship-docs');
          await scholarshipApi.saveDocument(saved.id, {
            documentType: SLOT_DOCTYPE[key],
            fileKey,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
        } catch {
          failed.push(file.name);
        }
      }
      if (failed.length > 0) {
        throw new Error(`${t('uploadFailed')}: ${failed.join(', ')}`);
      }

      const submitted = await scholarshipApi.submit(saved.id);
      setRequest(submitted);
      setPhase('success');
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      const message = apiMsg || (err as Error)?.message || t('genericError');
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep1Data({});
    setStep2Data({});
    setStep3Data({});
    setStep4Data({});
    setFiles(EMPTY_FILES);
    setDeclaration(false);
    setRequest(null);
    setDraftId(null);
    setSubmitError(null);
    setPhase(1);
  };

  return (
    <div className="space-y-6">
      {phase !== 'success' && <WizardProgress phase={phase} t={t} />}

      {submitError && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {submitError}
        </div>
      )}

      {phase === 1 && (
        <Step1Personal
          initialData={step1Data}
          onNext={(d) => {
            setStep1Data(d);
            setPhase(2);
          }}
        />
      )}
      {phase === 2 && (
        <Step2Academic
          initialData={step2Data}
          files={files}
          setFile={setFile}
          onBack={() => setPhase(1)}
          onNext={(d) => {
            setStep2Data(d);
            setPhase(3);
          }}
        />
      )}
      {phase === 3 && (
        <Step3Questions
          initialData={step3Data}
          onBack={() => setPhase(2)}
          onNext={(d) => {
            setStep3Data(d);
            setPhase(4);
          }}
        />
      )}
      {phase === 4 && (
        <Step4Guardian
          initialData={step4Data}
          files={files}
          setFile={setFile}
          declaration={declaration}
          setDeclaration={setDeclaration}
          submitting={submitting}
          onBack={() => setPhase(3)}
          onSubmit={(d) => {
            setStep4Data(d);
            handleFinalSubmit();
          }}
        />
      )}
      {phase === 'success' && request && (
        <SuccessScreen app={request} locale={locale} onReset={handleReset} />
      )}
    </div>
  );
}

// ─── Upload slot ────────────────────────────────────────────────────────────────

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

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function UploadSlot({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = useObjectUrl(file);

  const handleFile = (f: File) => {
    if (!DOC_ACCEPT.split(',').includes(f.type)) {
      setError(t('docTypeError'));
      return;
    }
    if (f.size > DOC_MAX_BYTES) {
      setError(t('docSizeError'));
      return;
    }
    setError(null);
    onChange(f);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700 leading-none">{label}</span>
        {required
          ? <span className="text-red-500 text-xs leading-none">*</span>
          : <span className="text-[10px] text-gray-400 leading-none">({t('optional')})</span>}
        {file && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
      </div>
      <div
        className={cn(
          'rounded-xl border-2 border-dashed transition-all duration-150',
          dragOver ? 'border-rmc-green bg-rmc-green-light'
            : file ? 'border-green-300 bg-green-50/40'
            : 'border-gray-200 bg-gray-50 hover:border-rmc-green hover:bg-rmc-green-light/20',
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
              aria-label={t('docRemove')}
              className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer text-center px-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <Upload className="w-3.5 h-3.5 text-rmc-green" />
            </div>
            <p className="text-xs text-gray-500 leading-snug">
              <span className="text-rmc-green font-medium">{t('docUpload')}</span> {t('docOrDrop')}
            </p>
            <p className="text-[10px] text-gray-400">{t('docHint')}</p>
            <input
              type="file"
              accept={DOC_ACCEPT}
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="text-rmc-green">{icon}</span> {title}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Step 1: Personal Information ────────────────────────────────────────────────

function Step1Personal({
  initialData,
  onNext,
}: {
  initialData: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const fullNamesValue = watch('fullNames') ?? '';
  const fullNamesError = errors.fullNames
    ? errors.fullNames.message === 'tooLong'
      ? t('fullNamesTooLongError')
      : t('fullNamesError')
    : undefined;

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell icon={<User className="w-4 h-4" />} title={t('step1Title')} subtitle={t('step1Subtitle')}>
        <Input
          label={t('fullNames')}
          required
          maxLength={150}
          {...register('fullNames')}
          error={fullNamesError}
          hint={!fullNamesError ? `${fullNamesValue.length}/150` : undefined}
        />

        <Input label={`${t('studentId')} (${t('optional')})`} maxLength={50} {...register('studentId')} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={`${t('email')} (${t('optional')})`}
            type="email"
            {...register('email')}
            error={errors.email && t('emailError')}
          />
          <Input
            label={t('phone')}
            required
            placeholder="0781234567"
            maxLength={10}
            {...register('phone')}
            error={errors.phone && t('phoneFormatError')}
            hint={!errors.phone ? t('phoneHint') : undefined}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('next')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

// ─── Step 2: Academic Information ────────────────────────────────────────────────

function Step2Academic({
  initialData,
  files,
  setFile,
  onBack,
  onNext,
}: {
  initialData: Partial<Step2Data>;
  files: DocFiles;
  setFile: (key: DocSlotKey, f: File | null) => void;
  onBack: () => void;
  onNext: (data: Step2Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const [docError, setDocError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const submit = (data: Step2Data) => {
    if (!files.transcript || !files.reportCard) {
      setDocError(t('docRequiredError'));
      return;
    }
    setDocError(null);
    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <StepShell icon={<GraduationCap className="w-4 h-4" />} title={t('step2Title')} subtitle={t('step2Subtitle')}>
        <Input
          label={t('schoolName')}
          required
          maxLength={200}
          {...register('schoolName')}
          error={errors.schoolName && t('requiredError')}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t('currentYear')}
            required
            placeholder={t('currentYearPlaceholder')}
            {...register('currentYear')}
            error={errors.currentYear && t('requiredError')}
          />
          <Input
            label={t('program')}
            required
            maxLength={PROGRAM_MAX}
            placeholder={t('programPlaceholder')}
            {...register('programCourse')}
            error={errors.programCourse && t('requiredError')}
          />
        </div>

        <Input
          label={`${t('averageGrade')} (${t('optional')})`}
          maxLength={20}
          placeholder={t('averageGradePlaceholder')}
          {...register('averageGrade')}
        />

        <div className="pt-1 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
            {t('requiredDocuments')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <UploadSlot
              label={t('docTranscript')}
              required
              file={files.transcript}
              onChange={(f) => setFile('transcript', f)}
            />
            <UploadSlot
              label={t('docReportCard')}
              required
              file={files.reportCard}
              onChange={(f) => setFile('reportCard', f)}
            />
          </div>
        </div>

        {docError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
            {docError}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
            {t('back')}
          </Button>
          <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('next')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

// ─── Step 3: Scholarship Questions ───────────────────────────────────────────────

function Step3Questions({
  initialData,
  onBack,
  onNext,
}: {
  initialData: Partial<Step3Data>;
  onBack: () => void;
  onNext: (data: Step3Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const why = watch('whyDeserve') ?? '';
  const how = watch('howHelp') ?? '';
  const elseVal = watch('anythingElse') ?? '';

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell icon={<MessageSquareText className="w-4 h-4" />} title={t('step3Title')} subtitle={t('step3Subtitle')}>
        <Textarea
          label={t('q1Label')}
          required
          rows={5}
          maxLength={WHY_MAX}
          placeholder={t('q1Placeholder')}
          {...register('whyDeserve')}
          error={errors.whyDeserve ? t('questionRequiredError') : undefined}
          hint={!errors.whyDeserve ? `${why.length}/${WHY_MAX}` : undefined}
        />

        <Textarea
          label={t('q2Label')}
          required
          rows={4}
          maxLength={HOW_MAX}
          placeholder={t('q2Placeholder')}
          {...register('howHelp')}
          error={errors.howHelp ? t('questionRequiredError') : undefined}
          hint={!errors.howHelp ? `${how.length}/${HOW_MAX}` : undefined}
        />

        <Textarea
          label={`${t('q3Label')} (${t('optional')})`}
          rows={3}
          maxLength={ELSE_MAX}
          placeholder={t('q3Placeholder')}
          {...register('anythingElse')}
          hint={`${elseVal.length}/${ELSE_MAX}`}
        />

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
            {t('back')}
          </Button>
          <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('next')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

// ─── Step 4: Guardian, Supporting Documents & Declaration ────────────────────────

function Step4Guardian({
  initialData,
  files,
  setFile,
  declaration,
  setDeclaration,
  submitting,
  onBack,
  onSubmit,
}: {
  initialData: Partial<Step4Data>;
  files: DocFiles;
  setFile: (key: DocSlotKey, f: File | null) => void;
  declaration: boolean;
  setDeclaration: (v: boolean) => void;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (data: Step4Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const [docError, setDocError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const submit = (data: Step4Data) => {
    if (!files.studentId) {
      setDocError(t('docRequiredError'));
      return;
    }
    setDocError(null);
    onSubmit(data);
  };

  const canSubmit = declaration && !!files.studentId && !submitting;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <StepShell icon={<Users className="w-4 h-4" />} title={t('step4Title')} subtitle={t('step4Subtitle')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t('guardianName')}
            required
            maxLength={150}
            {...register('guardianName')}
            error={errors.guardianName && t('requiredError')}
          />
          <Input
            label={t('guardianPhone')}
            required
            placeholder="0781234567"
            maxLength={10}
            {...register('guardianPhone')}
            error={errors.guardianPhone && t('phoneFormatError')}
            hint={!errors.guardianPhone ? t('phoneHint') : undefined}
          />
        </div>

        <Input
          label={`${t('householdIncome')} (${t('optional')})`}
          maxLength={INCOME_MAX}
          placeholder={t('householdIncomePlaceholder')}
          {...register('householdIncome')}
        />

        <div className="pt-1 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
            {t('supportingDocuments')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <UploadSlot
              label={t('docStudentId')}
              required
              file={files.studentId}
              onChange={(f) => setFile('studentId', f)}
            />
            <UploadSlot
              label={t('docRecommendation')}
              required={false}
              file={files.recommendation}
              onChange={(f) => setFile('recommendation', f)}
            />
            <UploadSlot
              label={t('docCertificates')}
              required={false}
              file={files.certificates}
              onChange={(f) => setFile('certificates', f)}
            />
            <UploadSlot
              label={t('docFinancial')}
              required={false}
              file={files.financial}
              onChange={(f) => setFile('financial', f)}
            />
          </div>
        </div>

        {docError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
            {docError}
          </div>
        )}

        {/* Declaration */}
        <div className="rounded-xl bg-rmc-green-light/60 border border-rmc-green-light px-4 py-3.5 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-rmc-green shrink-0 mt-0.5" />
          <Checkbox
            checked={declaration}
            onChange={(e) => setDeclaration(e.target.checked)}
            label={t('declaration')}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} disabled={submitting}>
            {t('back')}
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            rightIcon={!submitting ? <ArrowRight className="w-4 h-4" /> : undefined}
            disabled={!canSubmit}
          >
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

// ─── Success screen ──────────────────────────────────────────────────────────────

function SuccessScreen({
  app,
  locale,
  onReset,
}: {
  app: ScholarshipApplication;
  locale: string;
  onReset: () => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(app.applicationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1 bg-rmc-green" />
      <div className="px-6 sm:px-10 py-10 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('successTitle')}</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-8">{t('successText')}</p>
        <div className="max-w-xs mx-auto mb-8 rounded-xl bg-gray-50 border border-gray-300 px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">
            {t('applicationIdLabel')}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="font-mono text-lg font-bold text-gray-900">{app.applicationNumber}</span>
            <button
              type="button"
              onClick={copyId}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-rmc-green hover:text-rmc-green transition-colors"
              aria-label={t('copyId')}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{t('saveIdHint')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            href={`/${locale}/services/scholarship/status?id=${app.applicationNumber}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rmc-green hover:bg-rmc-green-dark text-white font-semibold text-sm transition-colors"
          >
            <Search className="w-4 h-4" /> {t('trackApplication')}
          </Link>
          <Button variant="outline" onClick={onReset} className="text-sm">
            {t('newApplication')}
          </Button>
        </div>
      </div>
    </div>
  );
}

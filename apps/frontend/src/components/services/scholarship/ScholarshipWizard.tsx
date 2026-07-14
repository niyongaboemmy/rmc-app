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
  CheckCircle2, Copy, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/lib/public-api';
import {
  scholarshipApi,
  scholarshipPublicApi,
  type CreateScholarshipApplicationPayload,
  type ScholarshipApplication,
  type ScholarshipProgram,
  type EducationLevel,
  type GuardianRelationship,
} from '@/lib/scholarshipApi';

// Local Rwandan mobile format the user types: 0 + network prefix (72/73/78/79) + 7 digits = 10 chars.
const PHONE_RE = /^07[2389][0-9]{7}$/;
const MOTIVATION_MAX = 1000;

/** +250781234567 (backend/API format) → 0781234567 (what the user sees/types). */
function toLocalPhone(e164: string): string {
  return e164?.startsWith('+250') ? `0${e164.slice(4)}` : e164;
}

/** 0781234567 (what the user types) → +250781234567 (backend/API format). */
function toE164Phone(local: string): string {
  return local?.startsWith('0') ? `+250${local.slice(1)}` : local;
}

const step1Schema = z.object({
  fullNames: z.string().min(3, 'tooShort').max(150, 'tooLong'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  nationalId: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email('invalidEmail').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_RE, 'phoneFormat'),
});
type Step1Data = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  districtId: z.string().optional().or(z.literal('')),
  sectorId: z.string().optional().or(z.literal('')),
  cell: z.string().max(100).optional().or(z.literal('')),
  village: z.string().max(100).optional().or(z.literal('')),
  schoolName: z.string().min(2, 'tooShort').max(200, 'tooLong'),
  educationLevel: z.enum(['secondary', 'tvet', 'university']),
  currentYear: z.string().min(1, 'required').max(50, 'tooLong'),
  averageGrade: z.string().max(20).optional().or(z.literal('')),
});
type Step2Data = z.infer<typeof step2Schema>;

const step3Schema = z.object({
  guardianName: z.string().min(3, 'tooShort').max(150, 'tooLong'),
  guardianPhone: z.string().regex(PHONE_RE, 'phoneFormat'),
  relationship: z.enum(['parent', 'guardian', 'sibling', 'other']),
  programId: z.string().optional().or(z.literal('')),
  motivation: z.string().min(10, 'tooShort').max(MOTIVATION_MAX, 'tooLong'),
});
type Step3Data = z.infer<typeof step3Schema>;

type District = { id: string; name: string };
type Sector = { id: string; name: string };
type WizardPhase = 1 | 2 | 3 | 'success';

interface Props {
  /** When editing a draft application, pre-fills the form and calls updateDraft instead of createDraft. */
  editRequest?: ScholarshipApplication;
  /** Pre-selects a program when arriving from the "Available Scholarships" listing (?program=). */
  initialProgramId?: string;
}

// ─── Shared 3-step progress header ─────────────────────────────────────────────

function WizardProgress({ phase, t }: { phase: WizardPhase; t: ReturnType<typeof useTranslations> }) {
  const steps: { key: 1 | 2 | 3; label: string }[] = [
    { key: 1, label: t('step1Title') },
    { key: 2, label: t('step2Title') },
    { key: 3, label: t('step3Title') },
  ];
  const order: (1 | 2 | 3)[] = [1, 2, 3];
  const currentIndex = phase === 'success' ? order.length : order.indexOf(phase as 1 | 2 | 3);

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
                  ? 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-md'
                  : done
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${active ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${done ? 'bg-violet-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ScholarshipWizard({ editRequest, initialProgramId }: Props) {
  const t = useTranslations('services.scholarship.apply');
  const { locale } = useParams<{ locale: string }>();

  // Lazily seeded from `editRequest` (never a post-mount effect) — react-hook-form
  // only reads `defaultValues` once, at mount, so populating these later would
  // leave a blank form even when editing an existing draft.
  const [phase, setPhase] = useState<WizardPhase>(1);
  const [step1Data, setStep1Data] = useState<Partial<Step1Data>>(() =>
    editRequest
      ? {
          fullNames: editRequest.fullNames,
          dateOfBirth: editRequest.dateOfBirth ?? '',
          gender: editRequest.gender ?? undefined,
          nationalId: editRequest.nationalId ?? '',
          email: editRequest.email ?? '',
          phone: toLocalPhone(editRequest.phone),
        }
      : {},
  );
  const [step2Data, setStep2Data] = useState<Partial<Step2Data>>(() =>
    editRequest
      ? {
          districtId: editRequest.districtId ?? '',
          sectorId: editRequest.sectorId ?? '',
          cell: editRequest.cell ?? '',
          village: editRequest.village ?? '',
          schoolName: editRequest.schoolName,
          educationLevel: editRequest.educationLevel,
          currentYear: editRequest.currentYear,
          averageGrade: editRequest.averageGrade ?? '',
        }
      : {},
  );
  const [request, setRequest] = useState<ScholarshipApplication | null>(editRequest ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStep1Next = (data: Step1Data) => {
    setStep1Data(data);
    setPhase(2);
  };

  const handleStep2Next = (data: Step2Data) => {
    setStep2Data(data);
    setPhase(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateScholarshipApplicationPayload = {
        fullNames: step1Data.fullNames!,
        dateOfBirth: step1Data.dateOfBirth || undefined,
        gender: step1Data.gender || undefined,
        nationalId: step1Data.nationalId || undefined,
        email: step1Data.email || undefined,
        phone: toE164Phone(step1Data.phone!),
        districtId: step2Data.districtId || undefined,
        sectorId: step2Data.sectorId || undefined,
        cell: step2Data.cell || undefined,
        village: step2Data.village || undefined,
        schoolName: step2Data.schoolName!,
        educationLevel: step2Data.educationLevel!,
        currentYear: step2Data.currentYear!,
        averageGrade: step2Data.averageGrade || undefined,
        guardianName: data.guardianName,
        guardianPhone: toE164Phone(data.guardianPhone),
        relationship: data.relationship,
        programId: data.programId || undefined,
        motivation: data.motivation,
      };

      const saved = editRequest
        ? await scholarshipApi.updateDraft(editRequest.id, payload)
        : await scholarshipApi.createDraft(payload);
      const submitted = await scholarshipApi.submit(saved.id);

      setRequest(submitted);
      setPhase('success');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t('genericError');
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep1Data({});
    setStep2Data({});
    setRequest(null);
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

      {phase === 1 && <Step1Identity initialData={step1Data} onNext={handleStep1Next} />}
      {phase === 2 && (
        <Step2Education initialData={step2Data} onBack={() => setPhase(1)} onNext={handleStep2Next} />
      )}
      {phase === 3 && (
        <Step3Guardian
          initialData={{
            guardianName: request?.guardianName ?? '',
            guardianPhone: request?.guardianPhone ? toLocalPhone(request.guardianPhone) : '',
            relationship: request?.relationship,
            programId: request?.programId ?? initialProgramId ?? '',
            motivation: request?.motivation ?? '',
          }}
          submitting={submitting}
          onBack={() => setPhase(2)}
          onSubmit={handleStep3Submit}
        />
      )}
      {phase === 'success' && request && (
        <SuccessScreen app={request} locale={locale} onReset={handleReset} />
      )}
    </div>
  );
}

// ─── Step 1: Identity & Contact ─────────────────────────────────────────────────

function Step1Identity({
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
    <form onSubmit={handleSubmit(onNext)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4 text-violet-500" /> {t('step1Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step1Subtitle')}</p>
      </div>

      <Input
        label={t('fullNames')}
        required
        maxLength={150}
        {...register('fullNames')}
        error={fullNamesError}
        hint={!fullNamesError ? `${fullNamesValue.length}/150` : undefined}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label={`${t('dateOfBirth')} (${t('optional')})`}
          type="date"
          {...register('dateOfBirth')}
        />
        <Select
          label={`${t('gender')} (${t('optional')})`}
          placeholder={t('gender')}
          {...register('gender')}
          options={[
            { value: 'male', label: t('male') },
            { value: 'female', label: t('female') },
          ]}
        />
      </div>

      <Input label={`${t('nationalId')} (${t('optional')})`} {...register('nationalId')} />

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
    </form>
  );
}

// ─── Step 2: Residence & Education ──────────────────────────────────────────────

function Step2Education({
  initialData,
  onBack,
  onNext,
}: {
  initialData: Partial<Step2Data>;
  onBack: () => void;
  onNext: (data: Step2Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const tLevels = useTranslations('services.scholarship.levels');
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const districtId = watch('districtId');

  useEffect(() => {
    publicApi.getDistricts().then(setDistricts).catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!districtId) {
      setSectors([]);
      return;
    }
    publicApi.getSectors(districtId).then(setSectors).catch(() => setSectors([]));
  }, [districtId]);

  const levelOptions: { value: EducationLevel; label: string }[] = [
    { value: 'secondary', label: tLevels('secondary') },
    { value: 'tvet', label: tLevels('tvet') },
    { value: 'university', label: tLevels('university') },
  ];

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-violet-500" /> {t('step2Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step2Subtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label={`${t('district')} (${t('optional')})`}
          placeholder={t('districtPlaceholder')}
          {...register('districtId', {
            onChange: () => setValue('sectorId', ''),
          })}
          options={districts.map((d) => ({ value: d.id, label: d.name }))}
        />
        <Select
          label={`${t('sector')} (${t('optional')})`}
          placeholder={districtId ? t('sectorPlaceholder') : t('selectDistrictFirst')}
          disabled={!districtId}
          {...register('sectorId')}
          options={sectors.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label={`${t('cell')} (${t('optional')})`} {...register('cell')} />
        <Input label={`${t('village')} (${t('optional')})`} {...register('village')} />
      </div>

      <Input
        label={t('schoolName')}
        required
        maxLength={200}
        {...register('schoolName')}
        error={errors.schoolName && t('fullNamesError')}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label={t('educationLevel')}
          placeholder={t('educationLevelPlaceholder')}
          {...register('educationLevel')}
          options={levelOptions}
        />
        <Input
          label={t('currentYear')}
          required
          {...register('currentYear')}
          error={errors.currentYear && t('fullNamesError')}
        />
      </div>

      <Input label={`${t('averageGrade')} (${t('optional')})`} {...register('averageGrade')} />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          {t('back')}
        </Button>
        <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
          {t('next')}
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Guardian & Program ─────────────────────────────────────────────────

function Step3Guardian({
  initialData,
  submitting,
  onBack,
  onSubmit,
}: {
  initialData: Partial<Step3Data>;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (data: Step3Data) => void;
}) {
  const t = useTranslations('services.scholarship.apply');
  const tRel = useTranslations('services.scholarship.relationships');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { ...initialData, relationship: initialData.relationship ?? 'parent' },
  });

  const motivationValue = watch('motivation') ?? '';

  useEffect(() => {
    scholarshipPublicApi.listPrograms().then(setPrograms).catch(() => setPrograms([]));
  }, []);

  const relationshipOptions: { value: GuardianRelationship; label: string }[] = [
    { value: 'parent', label: tRel('parent') },
    { value: 'guardian', label: tRel('guardian') },
    { value: 'sibling', label: tRel('sibling') },
    { value: 'other', label: tRel('other') },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" /> {t('step3Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step3Subtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label={t('guardianName')}
          required
          maxLength={150}
          {...register('guardianName')}
          error={errors.guardianName && t('fullNamesError')}
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

      <Select
        label={t('relationship')}
        placeholder={t('relationshipPlaceholder')}
        {...register('relationship')}
        options={relationshipOptions}
      />

      <Select
        label={`${t('program')} (${t('optional')})`}
        placeholder={t('programPlaceholder')}
        {...register('programId')}
        options={programs.map((p) => ({ value: p.id, label: p.title }))}
      />

      <Textarea
        label={t('motivation')}
        required
        rows={4}
        maxLength={MOTIVATION_MAX}
        {...register('motivation')}
        error={errors.motivation ? t('motivationRequiredError') : undefined}
        hint={!errors.motivation ? `${motivationValue.length}/${MOTIVATION_MAX}` : undefined}
      />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          {t('back')}
        </Button>
        <Button type="submit" isLoading={submitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
          {t('submit')}
        </Button>
      </div>
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
      <div className="h-1 bg-violet-500" />
      <div className="px-6 sm:px-10 py-10 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('successTitle')}</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-8">{t('successText')}</p>
        <div className="max-w-xs mx-auto mb-8 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">
            {t('applicationIdLabel')}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <span className="font-mono text-lg font-bold text-gray-900">{app.applicationNumber}</span>
            <button
              type="button"
              onClick={copyId}
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:border-violet-300 hover:text-violet-600 transition-colors"
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
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
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

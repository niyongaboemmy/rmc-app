'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  User, MapPin, Briefcase, FileText, ShieldCheck, Plus, Trash2,
  CheckCircle2, Copy, Check, Loader2, Search, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/lib/public-api';
import { uploadMedia } from '@/lib/mediaUpload';
import { goodConductPublicApi } from '@/lib/goodConductApi';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { cn } from '@/lib/utils';
import {
  jobsApi,
  type CreateJobApplicationPayload,
  type JobApplication,
  type JobDocument,
} from '@/lib/jobsApi';
import {
  DocumentField,
  type UploadTexts,
} from '@/components/services/shared/DocumentField';

// Local Rwandan mobile format: 0 + network prefix (72/73/78/79) + 7 digits.
const PHONE_RE = /^07[2389][0-9]{7}$/;
function toE164Phone(local: string): string {
  return local?.startsWith('0') ? `+250${local.slice(1)}` : local;
}

// Accepted MIME sets, shared across the document slots.
const DOC_MIME = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';
const CV_MIME = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMG_PDF_MIME = 'image/jpeg,image/png,application/pdf';

const schema = z.object({
  fullNames: z.string().min(3, 'fullNames').max(150),
  email: z.string().email('email').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_RE, 'phone'),
  districtId: z.string().optional().or(z.literal('')),
  sectorId: z.string().optional().or(z.literal('')),
  cell: z.string().max(100).optional().or(z.literal('')),
  village: z.string().max(100).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

type District = { id: string; name: string };
type Sector = { id: string; name: string };
type GoodConductMode = 'verify' | 'upload';

// The wizard steps, in order.
const STEPS = ['position', 'residence', 'documents', 'review'] as const;
type Step = (typeof STEPS)[number];

export function JobApplicationForm() {
  const t = useTranslations('services.jobs.apply');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const values = watch();
  const districtId = watch('districtId');
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  // ── Wizard position ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const currentStep: Step = STEPS[step];

  // ── Job selection (apply to an admin-posted vacancy) ──────────────────────────
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get('job') || '';
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loadingPostings, setLoadingPostings] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const selectedPosting = postings.find((p) => p.id === selectedJobId) ?? null;

  useEffect(() => {
    jobPostingsApi
      .listOpen()
      .then((list) => {
        setPostings(list);
        if (preselectedJobId && list.some((p) => p.id === preselectedJobId)) {
          setSelectedJobId(preselectedJobId);
        }
      })
      .catch(() => setPostings([]))
      .finally(() => setLoadingPostings(false));
  }, [preselectedJobId]);

  // ── Document state (validated on select by DocumentField) ─────────────────────
  const [applicationLetter, setApplicationLetter] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [nationalId, setNationalId] = useState<File | null>(null);
  const [criminalRecord, setCriminalRecord] = useState<File | null>(null);
  const [academicPapers, setAcademicPapers] = useState<(File | null)[]>([null]);
  const [employerRec, setEmployerRec] = useState<File | null>(null);

  // ── Good conduct: verify a number OR upload the certificate ───────────────────
  const [gcMode, setGcMode] = useState<GoodConductMode>('verify');
  const [gcNumber, setGcNumber] = useState('');
  const [gcVerifying, setGcVerifying] = useState(false);
  const [gcVerifiedName, setGcVerifiedName] = useState<string | null>(null);
  const [gcVerifyError, setGcVerifyError] = useState<string | null>(null);
  const [gcFile, setGcFile] = useState<File | null>(null);

  // ── Submission state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<JobApplication | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    publicApi.getDistricts().then(setDistricts).catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!districtId) { setSectors([]); return; }
    publicApi.getSectors(districtId).then(setSectors).catch(() => setSectors([]));
  }, [districtId]);

  const uploadTexts: UploadTexts = useMemo(
    () => ({
      uploadOrDrop: t('uploadOrDrop'),
      change: t('change'),
      remove: t('remove'),
      unsupportedType: t('unsupportedType'),
      tooLarge: (mb: number) => t('fileTooLarge', { mb }),
    }),
    [t],
  );

  const verifyGoodConduct = async () => {
    const num = gcNumber.trim();
    if (!num) return;
    setGcVerifying(true);
    setGcVerifyError(null);
    setGcVerifiedName(null);
    try {
      const res = await goodConductPublicApi.verify(num);
      if (res) setGcVerifiedName(res.fullName);
      else setGcVerifyError(t('verifyFailed'));
    } catch {
      setGcVerifyError(t('verifyFailed'));
    } finally {
      setGcVerifying(false);
    }
  };

  const setPaper = (i: number, f: File | null) =>
    setAcademicPapers((prev) => prev.map((p, idx) => (idx === i ? f : p)));
  const addPaper = () => setAcademicPapers((prev) => [...prev, null]);
  const removePaper = (i: number) =>
    setAcademicPapers((prev) => (prev.length === 1 ? [null] : prev.filter((_, idx) => idx !== i)));

  const goodConductSatisfied =
    gcMode === 'verify' ? !!gcVerifiedName : !!gcFile;

  const attachedPapers = academicPapers.filter((f): f is File => f !== null);

  /** Validate the documents step; sets formError on failure. */
  const validateDocuments = (): boolean => {
    if (!applicationLetter || !cv || !nationalId || !criminalRecord) {
      setFormError(t('requiredDocsMissing'));
      return false;
    }
    if (attachedPapers.length === 0) {
      setFormError(t('academicPapersRequired'));
      return false;
    }
    if (!goodConductSatisfied) {
      setFormError(t('goodConductRequired'));
      return false;
    }
    setFormError(null);
    return true;
  };

  // ── Step navigation ───────────────────────────────────────────────────────────
  const goNext = async () => {
    setSubmitError(null);
    if (currentStep === 'position') {
      const okFields = await trigger(['fullNames', 'phone', 'email']);
      if (!selectedJobId) { setJobError(t('jobRequired')); }
      if (!okFields || !selectedJobId) return;
      setStep(1);
    } else if (currentStep === 'residence') {
      setStep(2);
    } else if (currentStep === 'documents') {
      if (!validateDocuments()) return;
      setStep(3);
    }
  };

  const goBack = () => { setFormError(null); setSubmitError(null); setStep((s) => Math.max(0, s - 1)); };
  const goToStep = (i: number) => { if (i < step) { setFormError(null); setSubmitError(null); setStep(i); } };

  const onSubmit = async (data: FormData) => {
    // Only the final Review step submits; guard against stray Enter presses.
    if (currentStep !== 'review') return;
    if (!selectedJobId) { setJobError(t('jobRequired')); setStep(0); return; }
    if (!validateDocuments()) { setStep(2); return; }

    setSubmitError(null);
    setSubmitting(true);

    try {
      // Upload everything to the file-server, collecting stored keys.
      const up = async (f: File): Promise<JobDocument> => ({
        key: await uploadMedia(f, 'job-applications'),
        name: f.name,
      });

      const [
        applicationLetterDoc,
        cvDoc,
        nationalIdDoc,
        criminalRecordDoc,
        academicPaperDocs,
      ] = await Promise.all([
        up(applicationLetter as File),
        up(cv as File),
        up(nationalId as File),
        up(criminalRecord as File),
        Promise.all(attachedPapers.map(up)),
      ]);

      const documents: CreateJobApplicationPayload['documents'] = {
        applicationLetter: applicationLetterDoc,
        cv: cvDoc,
        nationalId: nationalIdDoc,
        criminalRecord: criminalRecordDoc,
        academicPapers: academicPaperDocs,
      };

      if (gcMode === 'verify') {
        documents.goodConductCertificateNumber = gcNumber.trim();
      } else if (gcFile) {
        documents.goodConductCertificate = await up(gcFile);
      }
      if (employerRec) {
        documents.employerRecommendation = await up(employerRec);
      }

      const payload: CreateJobApplicationPayload = {
        fullNames: data.fullNames,
        email: data.email || undefined,
        phone: toE164Phone(data.phone),
        jobPostingId: selectedJobId,
        districtId: data.districtId || undefined,
        sectorId: data.sectorId || undefined,
        cell: data.cell || undefined,
        village: data.village || undefined,
        documents,
      };

      const created = await jobsApi.create(payload);
      setResult(created);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as Error)?.message ||
        t('genericError');
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────────
  if (result) {
    const copy = () => {
      navigator.clipboard.writeText(result.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('successTitle')}</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{t('successText')}</p>
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('trackingNumber')}</p>
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
            <code className="text-sm font-mono text-gray-700">{result.trackingCode}</code>
            <button onClick={copy} aria-label={t('trackingNumber')} className="text-gray-400 hover:text-gray-600">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            className="!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500"
            onClick={() => router.push(`/${locale}/services/jobs/status`)}
          >
            {t('checkStatusBtn')}
          </Button>
        </div>
      </div>
    );
  }

  const fieldError = (key: 'fullNames' | 'email' | 'phone') =>
    key === 'fullNames'
      ? errors.fullNames && t('fullNamesError')
      : key === 'email'
        ? errors.email && t('emailError')
        : errors.phone && t('phoneFormatError');

  const stepLabels: Record<Step, string> = {
    position: t('stepPosition'),
    residence: t('stepResidence'),
    documents: t('stepDocuments'),
    review: t('stepReview'),
  };
  const stepIcons = [User, MapPin, FileText, CheckCircle2];

  const districtName = districts.find((d) => d.id === values.districtId)?.name;
  const sectorName = sectors.find((s) => s.id === values.sectorId)?.name;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ── Stepper ── */}
      <nav aria-label="Progress" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <ol className="flex items-center">
          {STEPS.map((s, i) => {
            const Icon = stepIcons[i];
            const done = i < step;
            const active = i === step;
            return (
              <li key={s} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  disabled={i >= step}
                  className={cn('flex items-center gap-2 min-w-0', i < step ? 'cursor-pointer' : 'cursor-default')}
                >
                  <span className={cn(
                    'w-9 h-9 shrink-0 rounded-full flex items-center justify-center ring-1 transition-colors',
                    done && 'bg-emerald-600 text-white ring-emerald-600',
                    active && 'bg-emerald-50 text-emerald-700 ring-emerald-500',
                    !done && !active && 'bg-gray-50 text-gray-300 ring-gray-200',
                  )}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </span>
                  <span className={cn(
                    'text-xs font-semibold hidden sm:block truncate',
                    active ? 'text-emerald-700' : done ? 'text-gray-700' : 'text-gray-400',
                  )}>
                    {stepLabels[s]}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className={cn('flex-1 h-px mx-2 sm:mx-3', i < step ? 'bg-emerald-500' : 'bg-gray-200')} />
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-[11px] text-gray-400 mt-3 sm:hidden">{t('stepCounter', { current: step + 1, total: STEPS.length })}</p>
      </nav>

      {/* ── Step 1: Position & applicant ── */}
      {currentStep === 'position' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" /> {t('sectionApplicant')}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{t('sectionApplicantSub')}</p>
          </div>

          <Input label={t('fullNames')} required maxLength={150} {...register('fullNames')} error={fieldError('fullNames') || undefined} />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={`${t('email')} (${t('optional')})`} type="email" {...register('email')} error={fieldError('email') || undefined} />
            <Input label={t('phone')} required placeholder="0781234567" maxLength={10} {...register('phone')} error={fieldError('phone') || undefined} hint={!errors.phone ? t('phoneHint') : undefined} />
          </div>

          <div>
            <Select
              label={t('jobSelect')}
              required
              placeholder={loadingPostings ? t('jobLoading') : postings.length ? t('jobSelectPlaceholder') : t('jobNone')}
              disabled={loadingPostings || postings.length === 0}
              value={selectedJobId}
              onChange={(e) => { setSelectedJobId(e.target.value); setJobError(null); }}
              options={postings.map((p) => ({
                value: p.id,
                label: `${p.title}${p.location ? ' — ' + p.location : ''}`,
              }))}
              error={jobError || undefined}
              hint={
                selectedPosting
                  ? `${EMPLOYMENT_TYPE_LABELS[selectedPosting.employmentType]}${selectedPosting.department ? ' · ' + selectedPosting.department : ''}${selectedPosting.numberOfPositions > 1 ? ` · ${selectedPosting.numberOfPositions} ${t('jobPositions')}` : ''}`
                  : undefined
              }
            />
            {!loadingPostings && postings.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {t('jobNoneHint')}{' '}
                <Link href={`/${locale}/services/jobs`} className="text-emerald-600 hover:underline font-medium">
                  {t('jobBrowse')}
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Step 2: Residence ── */}
      {currentStep === 'residence' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" /> {t('sectionResidence')}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label={`${t('district')} (${t('optional')})`}
              placeholder={t('districtPlaceholder')}
              {...register('districtId', { onChange: () => setValue('sectorId', '') })}
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
        </section>
      )}

      {/* ── Step 3: Documents ── */}
      {currentStep === 'documents' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" /> {t('sectionDocuments')}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{t('sectionDocumentsSub')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <DocumentField label={t('applicationLetter')} required accept={DOC_MIME} maxMb={10} hint={t('applicationLetterHint')} file={applicationLetter} onChange={setApplicationLetter} texts={uploadTexts} />
            <DocumentField label={t('cv')} required accept={CV_MIME} maxMb={10} hint={t('cvHint')} file={cv} onChange={setCv} texts={uploadTexts} />
            <DocumentField label={t('nationalId')} required accept={IMG_PDF_MIME} maxMb={5} hint={t('nationalIdHint')} file={nationalId} onChange={setNationalId} texts={uploadTexts} />
            <DocumentField label={t('criminalRecord')} required accept={IMG_PDF_MIME} maxMb={10} hint={t('criminalRecordHint')} file={criminalRecord} onChange={setCriminalRecord} texts={uploadTexts} />
          </div>

          {/* Repeatable academic papers */}
          <div className="border-t border-dashed border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {t('academicPapers')}<span className="text-red-500 ml-0.5">*</span>
                </p>
                <p className="text-[11px] text-gray-400">{t('academicPapersHint')}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {academicPapers.map((paper, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <DocumentField
                      label={`${t('academicPapers')} ${i + 1}`}
                      accept={IMG_PDF_MIME}
                      maxMb={10}
                      file={paper}
                      onChange={(f) => setPaper(i, f)}
                      texts={uploadTexts}
                    />
                  </div>
                  {academicPapers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaper(i)}
                      aria-label={t('remove')}
                      className="mt-6 w-8 h-8 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPaper}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-4 h-4" /> {t('addAcademicPaper')}
            </button>
          </div>

          {/* Good conduct — either verify a number OR upload the certificate */}
          <div className="border-t border-dashed border-gray-200 pt-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {t('goodConduct')}<span className="text-red-500 ml-0.5">*</span>
              </p>
              <p className="text-[11px] text-gray-400">{t('goodConductSub')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['verify', 'upload'] as GoodConductMode[]).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                    gcMode === mode ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input type="radio" name="gcMode" value={mode} checked={gcMode === mode} onChange={() => setGcMode(mode)} className="sr-only" />
                  <span className={`text-sm font-medium ${gcMode === mode ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {mode === 'verify' ? t('goodConductVerifyOption') : t('goodConductUploadOption')}
                  </span>
                </label>
              ))}
            </div>

            {gcMode === 'verify' ? (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label={t('goodConductNumber')}
                      placeholder={t('goodConductNumberPlaceholder')}
                      value={gcNumber}
                      onChange={(e) => { setGcNumber(e.target.value); setGcVerifiedName(null); setGcVerifyError(null); }}
                      leftIcon={<Search className="w-4 h-4" />}
                      error={gcVerifyError || undefined}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="!border-emerald-500 !text-emerald-600 hover:!bg-emerald-50 focus:!ring-emerald-500"
                    onClick={verifyGoodConduct}
                    disabled={!gcNumber.trim() || gcVerifying}
                    isLoading={gcVerifying}
                  >
                    {gcVerifying ? t('verifying') : t('verify')}
                  </Button>
                </div>
                {gcVerifiedName && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t('verifiedFor', { name: gcVerifiedName })}
                  </p>
                )}
              </div>
            ) : (
              <div className="sm:max-w-sm">
                <DocumentField label={t('goodConductFile')} accept={IMG_PDF_MIME} maxMb={5} hint={t('goodConductFileHint')} file={gcFile} onChange={setGcFile} texts={uploadTexts} />
              </div>
            )}
          </div>

          {/* Optional employer recommendation */}
          <div className="border-t border-dashed border-gray-200 pt-5 sm:max-w-sm">
            <DocumentField label={`${t('employerRecommendation')} (${t('optional')})`} accept={IMG_PDF_MIME} maxMb={10} hint={t('employerRecommendationHint')} file={employerRec} onChange={setEmployerRec} texts={uploadTexts} />
          </div>
        </section>
      )}

      {/* ── Step 4: Review & submit ── */}
      {currentStep === 'review' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('stepReview')}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{t('stepReviewSub')}</p>
          </div>

          <ReviewGroup title={t('stepPosition')} icon={<Briefcase className="w-4 h-4" />} onEdit={() => setStep(0)} editLabel={t('reviewEdit')}>
            <ReviewRow label={t('jobSelect')} value={selectedPosting ? `${selectedPosting.title}${selectedPosting.location ? ' — ' + selectedPosting.location : ''}` : t('reviewNotProvided')} />
            <ReviewRow label={t('fullNames')} value={values.fullNames || t('reviewNotProvided')} />
            <ReviewRow label={t('email')} value={values.email || t('reviewNotProvided')} />
            <ReviewRow label={t('phone')} value={values.phone || t('reviewNotProvided')} />
          </ReviewGroup>

          <ReviewGroup title={t('stepResidence')} icon={<MapPin className="w-4 h-4" />} onEdit={() => setStep(1)} editLabel={t('reviewEdit')}>
            <ReviewRow label={t('district')} value={districtName || t('reviewNotProvided')} />
            <ReviewRow label={t('sector')} value={sectorName || t('reviewNotProvided')} />
            <ReviewRow label={t('cell')} value={values.cell || t('reviewNotProvided')} />
            <ReviewRow label={t('village')} value={values.village || t('reviewNotProvided')} />
          </ReviewGroup>

          <ReviewGroup title={t('stepDocuments')} icon={<FileText className="w-4 h-4" />} onEdit={() => setStep(2)} editLabel={t('reviewEdit')}>
            <ReviewRow label={t('applicationLetter')} value={applicationLetter?.name || t('reviewNotProvided')} />
            <ReviewRow label={t('cv')} value={cv?.name || t('reviewNotProvided')} />
            <ReviewRow label={t('nationalId')} value={nationalId?.name || t('reviewNotProvided')} />
            <ReviewRow label={t('criminalRecord')} value={criminalRecord?.name || t('reviewNotProvided')} />
            <ReviewRow label={t('academicPapers')} value={t('reviewDocsCount', { count: attachedPapers.length })} />
            <ReviewRow
              label={t('goodConduct')}
              value={gcMode === 'verify'
                ? (gcVerifiedName ? t('reviewGoodConductVerified', { name: gcVerifiedName }) : t('reviewNotProvided'))
                : (gcFile ? t('reviewGoodConductUploaded') : t('reviewNotProvided'))}
            />
            {employerRec && <ReviewRow label={t('employerRecommendation')} value={employerRec.name} />}
          </ReviewGroup>
        </section>
      )}

      {(formError || submitError) && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {formError || submitError}
        </div>
      )}

      {/* ── Footer navigation ── */}
      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={goBack} className="!border-gray-300 !text-gray-600 hover:!bg-gray-50">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {t('back')}
          </Button>
        ) : <span />}

        <div className="flex items-center gap-3">
          {submitting && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('uploadingDocuments')}
            </span>
          )}
          {currentStep === 'review' ? (
            <Button
              type="submit"
              isLoading={submitting}
              className="!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500"
            >
              {submitting ? t('submitting') : t('submit')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              className="!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500"
            >
              {t('next')} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// ── Review helpers ────────────────────────────────────────────────────────────────

function ReviewGroup({
  title, icon, onEdit, editLabel, children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-emerald-500">{icon}</span> {title}
        </p>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
          {editLabel}
        </button>
      </div>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 break-words">{value}</dd>
    </div>
  );
}

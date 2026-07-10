'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight, ArrowLeft, User, MapPin, Building2, Briefcase,
  Smartphone, Landmark, Loader2, CheckCircle2, Copy, Check, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/lib/public-api';
import {
  goodConductApi,
  goodConductPublicApi,
  type CreateGoodConductRequestPayload,
  type GoodConductRequest,
  type GoodConductMotif,
  type BankTransferDetails,
} from '@/lib/goodConductApi';

// Local Rwandan mobile format the user types: 0 + network prefix (72/73/78/79) + 7 digits = 10 chars.
const PHONE_RE = /^07[2389][0-9]{7}$/;
const MOTIF_DETAIL_MAX = 500;

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
  fatherName: z.string().min(3, 'tooShort').max(150, 'tooLong').optional().or(z.literal('')),
  motherName: z.string().min(3, 'tooShort').max(150, 'tooLong').optional().or(z.literal('')),
  districtId: z.string().optional().or(z.literal('')),
  sectorId: z.string().optional().or(z.literal('')),
  cell: z.string().max(100).optional().or(z.literal('')),
  village: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('invalidEmail').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_RE, 'phoneFormat'),
});
type Step1Data = z.infer<typeof step1Schema>;

const step2Schema = z
  .object({
    mosqueId: z.string().optional().or(z.literal('')),
    requestedImamName: z.string().max(150).optional().or(z.literal('')),
    motif: z.enum(['employment', 'visa', 'school', 'other']),
    motifDetail: z.string().max(MOTIF_DETAIL_MAX).optional().or(z.literal('')),
  })
  .refine((d) => d.motif !== 'other' || (d.motifDetail && d.motifDetail.trim().length > 0), {
    message: 'motifDetailRequired',
    path: ['motifDetail'],
  });
type Step2Data = z.infer<typeof step2Schema>;

type District = { id: string; name: string };
type Sector = { id: string; name: string };
type Mosque = { id: string; name: string; imamName: string | null };
type WizardPhase = 1 | 2 | 'payment';

interface Props {
  /** When editing a more_info_requested request, pre-fills the form and calls updateDraft instead of createDraft. */
  editRequest?: GoodConductRequest;
}

// ─── Shared 3-step progress header (Identity → Masjid & Reason → Payment) ──────

function WizardProgress({ phase, t }: { phase: WizardPhase; t: ReturnType<typeof useTranslations> }) {
  const steps: { key: WizardPhase; label: string }[] = [
    { key: 1, label: t('step1Title') },
    { key: 2, label: t('step2Title') },
    { key: 'payment', label: t('paymentSection') },
  ];
  const order: WizardPhase[] = [1, 2, 'payment'];
  const currentIndex = order.indexOf(phase);

  return (
    <div className="flex items-center gap-2 sm:gap-3" role="list" aria-label={t('progressLabel')}>
      {steps.map(({ key, label }, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={key} className="flex items-center gap-2 flex-1" role="listitem">
            <span
              aria-current={active ? 'step' : undefined}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                active
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md'
                  : done
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${active ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${done ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GoodConductWizard({ editRequest }: Props) {
  const t = useTranslations('services.conduct.apply');

  // Lazily seeded from `editRequest` (never a post-mount effect): the parent
  // page already gates rendering of this component behind its own "loading
  // the request to edit" state, so `editRequest` is fully available on first
  // render here. Populating these via a `useEffect` instead left a one-render
  // gap where `Step1Identity`'s `useForm({ defaultValues })` locked in empty
  // values before the effect ever ran — react-hook-form only reads
  // `defaultValues` once, at mount, so the edit form silently stayed blank.
  const [phase, setPhase] = useState<WizardPhase>(1);
  const [step1Data, setStep1Data] = useState<Partial<Step1Data>>(() =>
    editRequest
      ? {
          fullNames: editRequest.fullNames,
          fatherName: editRequest.fatherName ?? '',
          motherName: editRequest.motherName ?? '',
          districtId: editRequest.districtId ?? '',
          sectorId: editRequest.sectorId ?? '',
          cell: editRequest.cell ?? '',
          village: editRequest.village ?? '',
          email: editRequest.email ?? '',
          phone: toLocalPhone(editRequest.phone),
        }
      : {},
  );
  const [request, setRequest] = useState<GoodConductRequest | null>(editRequest ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStep1Next = (data: Step1Data) => {
    setStep1Data(data);
    setPhase(2);
  };

  const handleStep2Submit = async (data: Step2Data) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateGoodConductRequestPayload = {
        fullNames: step1Data.fullNames!,
        fatherName: step1Data.fatherName || undefined,
        motherName: step1Data.motherName || undefined,
        districtId: step1Data.districtId || undefined,
        sectorId: step1Data.sectorId || undefined,
        cell: step1Data.cell || undefined,
        village: step1Data.village || undefined,
        email: step1Data.email || undefined,
        phone: toE164Phone(step1Data.phone!),
        mosqueId: data.mosqueId || undefined,
        requestedImamName: data.requestedImamName || undefined,
        motif: data.motif,
        motifDetail: data.motifDetail || undefined,
      };

      const saved = editRequest
        ? await goodConductApi.updateDraft(editRequest.id, payload)
        : await goodConductApi.createDraft(payload);

      setRequest(saved);
      setPhase('payment');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t('genericError');
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <WizardProgress phase={phase} t={t} />

      {submitError && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {submitError}
        </div>
      )}

      {phase === 1 && (
        <Step1Identity initialData={step1Data} onNext={handleStep1Next} />
      )}
      {phase === 2 && (
        <Step2Masjid
          initialData={{
            mosqueId: request?.mosqueId ?? '',
            requestedImamName: request?.requestedImamName ?? '',
            motif: request?.motif,
            motifDetail: request?.motifDetail ?? '',
          }}
          districtId={step1Data.districtId}
          submitting={submitting}
          onBack={() => setPhase(1)}
          onSubmit={handleStep2Submit}
        />
      )}
      {phase === 'payment' && request && (
        <PaymentStep request={request} onCancel={() => setPhase(2)} />
      )}
    </div>
  );
}

// ─── Step 1: Identity, Residence, Contact ──────────────────────────────────────

function Step1Identity({
  initialData,
  onNext,
}: {
  initialData: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}) {
  const t = useTranslations('services.conduct.apply');
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    // Validate as soon as a field is touched (blur), then live on every
    // keystroke once it has an error — friendlier than only-on-submit.
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  const districtId = watch('districtId');
  const fullNamesValue = watch('fullNames') ?? '';

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

  const fullNamesError = errors.fullNames
    ? errors.fullNames.message === 'tooShort'
      ? t('fullNamesError')
      : errors.fullNames.message === 'tooLong'
        ? t('fullNamesTooLongError')
        : t('fullNamesError')
    : undefined;

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" /> {t('step1Title')}
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
          label={`${t('fatherName')} (${t('optional')})`}
          {...register('fatherName')}
          error={errors.fatherName && t('optionalNameLengthError')}
        />
        <Input
          label={`${t('motherName')} (${t('optional')})`}
          {...register('motherName')}
          error={errors.motherName && t('optionalNameLengthError')}
        />
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

// ─── Step 2: Masjid, Imam, Motif ────────────────────────────────────────────────

const MOTIF_OPTIONS: { value: GoodConductMotif; icon: typeof Briefcase }[] = [
  { value: 'employment', icon: Briefcase },
  { value: 'visa', icon: MapPin },
  { value: 'school', icon: Building2 },
  { value: 'other', icon: User },
];

function Step2Masjid({
  initialData,
  districtId,
  submitting,
  onBack,
  onSubmit,
}: {
  initialData: Partial<Step2Data>;
  districtId?: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (data: Step2Data) => void;
}) {
  const t = useTranslations('services.conduct.apply');
  const [mosques, setMosques] = useState<Mosque[]>([]);

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
    // `initialData.motif` is explicitly `undefined` (not just absent) when there's
    // no prior request, e.g. `{ motif: request?.motif }` — a later object spread
    // still overwrites an earlier key even when its value is `undefined`, so the
    // 'employment' fallback must come last, applied only when still unset.
    defaultValues: { ...initialData, motif: initialData.motif ?? 'employment' },
  });

  const motif = watch('motif');
  const motifDetailValue = watch('motifDetail') ?? '';

  useEffect(() => {
    publicApi.getMosques(districtId).then(setMosques).catch(() => setMosques([]));
  }, [districtId]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-500" /> {t('step2Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step2Subtitle')}</p>
      </div>

      <Select
        label={`${t('mosque')} (${t('optional')})`}
        placeholder={t('mosquePlaceholder')}
        {...register('mosqueId', {
          onChange: (e) => {
            // Default the Imam field to the selected mosque's registered Imam —
            // applicants can still overwrite it if they expect someone else to attest.
            const mosque = mosques.find((m) => m.id === e.target.value);
            if (mosque?.imamName) setValue('requestedImamName', mosque.imamName);
          },
        })}
        options={mosques.map((m) => ({ value: m.id, label: m.name }))}
      />

      <Input
        label={`${t('requestedImamName')} (${t('optional')})`}
        hint={t('requestedImamHint')}
        {...register('requestedImamName')}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('motif')}<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MOTIF_OPTIONS.map(({ value, icon: Icon }) => (
            <label
              key={value}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${
                motif === value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input type="radio" value={value} {...register('motif')} className="sr-only" />
              <Icon className={`w-4 h-4 ${motif === value ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${motif === value ? 'text-indigo-700' : 'text-gray-600'}`}>
                {t(`motifOptions.${value}`)}
              </span>
            </label>
          ))}
        </div>
        {errors.motif && <p className="mt-2 text-xs text-red-600">{t('motifRequiredError')}</p>}
      </div>

      {motif === 'other' && (
        <Textarea
          label={t('motifDetail')}
          required
          rows={3}
          maxLength={MOTIF_DETAIL_MAX}
          {...register('motifDetail')}
          error={errors.motifDetail ? t('motifDetailRequiredError') : undefined}
          hint={!errors.motifDetail ? `${motifDetailValue.length}/${MOTIF_DETAIL_MAX}` : undefined}
        />
      )}

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

// ─── Payment step ───────────────────────────────────────────────────────────────

function PaymentStep({ request: initialRequest, onCancel }: { request: GoodConductRequest; onCancel: () => void }) {
  const t = useTranslations('services.conduct.apply');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const [request, setRequest] = useState(initialRequest);
  const [phone, setPhone] = useState(toLocalPhone(initialRequest.phone) || '');
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'confirmed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);
  const [bankNoticeSent, setBankNoticeSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankTransferDetails | null | 'loading'>('loading');
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const result = await goodConductApi.checkPaymentStatus(request.id);
        if (result.paymentStatus === 'paid' || result.gatewayStatus === 'SUCCESSFUL') {
          stopPolling();
          setPhase('confirmed');
        } else if (result.paymentStatus === 'failed' || result.gatewayStatus === 'FAILED') {
          stopPolling();
          setPhase('failed');
          setError(t('paymentDeclined'));
        }
      } catch {
        // transient error — keep polling
      }
    }, 5000);
  }, [request.id, stopPolling, t]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (!showBank) return;
    goodConductPublicApi.getBankDetails().then(setBankDetails);
  }, [showBank]);

  const handlePayNow = async () => {
    if (!PHONE_RE.test(phone)) {
      setError(t('phoneFormatError'));
      return;
    }
    setError(null);
    setPhase('waiting');
    try {
      const result = await goodConductApi.initiateMomoPayment(request.id, toE164Phone(phone));
      setRequest(result.request);
      if (result.request.paymentStatus === 'paid') {
        setPhase('confirmed');
      } else {
        startPolling();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t('genericError');
      setError(Array.isArray(message) ? message.join(', ') : message);
      setPhase('idle');
    }
  };

  const handleBankNotice = async () => {
    try {
      await goodConductApi.submitBankTransferNotice(request.id);
      setBankNoticeSent(true);
    } catch {
      setError(t('genericError'));
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(request.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (phase === 'confirmed') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('successTitle')}</h2>
        <p className="text-gray-500 text-sm">{t('successText')}</p>
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <code className="text-sm font-mono text-gray-700">{request.id}</code>
          <button onClick={copyId} aria-label="Copy request ID" className="text-gray-400 hover:text-gray-600">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <Button onClick={() => router.push(`/${locale}/services/good-conduct/status`)}>
            {t('checkStatusBtn')}
          </Button>
        </div>
      </div>
    );
  }

  if (bankNoticeSent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
          <Landmark className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('bankNoticeSentTitle')}</h2>
        <p className="text-gray-500 text-sm">{t('bankNoticeSentText')}</p>
        <Button onClick={() => router.push(`/${locale}/services/good-conduct/status`)}>
          {t('checkStatusBtn')}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
      <h2 className="font-bold text-gray-900">{t('paymentSection')}</h2>

      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-indigo-900">{t('amountDue')}</span>
        <span className="text-lg font-bold text-indigo-900 font-mono">
          {Number(request.amountDue).toLocaleString()} RWF
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>
      )}

      {phase === 'waiting' ? (
        <div className="text-center py-6 space-y-3">
          <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-600">{t('waitingForPayment')}</p>
          <Button variant="outline" size="sm" onClick={() => { stopPolling(); setPhase('idle'); }}>
            {t('cancelPayment')}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <Input
              label={t('momoPhone')}
              placeholder="0781234567"
              maxLength={10}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setVerified(false); }}
              leftIcon={<Smartphone className="w-4 h-4" />}
              hint={PHONE_RE.test(phone) ? undefined : t('phoneHint')}
            />
            <Button
              fullWidth
              onClick={handlePayNow}
              disabled={!PHONE_RE.test(phone)}
              leftIcon={<Smartphone className="w-4 h-4" />}
            >
              {t('payNow')}
            </Button>
          </div>

          <div className="relative text-center">
            <span className="relative bg-white px-3 text-xs text-gray-400 uppercase tracking-wide">{t('or')}</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-gray-200" />
          </div>

          {!showBank ? (
            <Button variant="outline" fullWidth leftIcon={<Landmark className="w-4 h-4" />} onClick={() => setShowBank(true)}>
              {t('payBankInstead')}
            </Button>
          ) : (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm text-gray-600">{t('bankDetails')}</p>
              {bankDetails === 'loading' ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('loadingBankDetails')}
                </div>
              ) : bankDetails ? (
                <div className="text-sm font-mono bg-gray-50 rounded-lg p-3 space-y-1">
                  <p>{bankDetails.bankName}</p>
                  <p>{t('accountLabel')}: {bankDetails.accountNumber}</p>
                  <p>{t('nameLabel')}: {bankDetails.accountName}</p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" /> {t('bankDetailsUnavailable')}
                </div>
              )}
              <Button fullWidth variant="secondary" onClick={handleBankNotice} disabled={!bankDetails || bankDetails === 'loading'}>
                {t('confirmedTransfer')}
              </Button>
            </div>
          )}

          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 mx-auto block">
            {t('back')}
          </button>
        </>
      )}
    </div>
  );
}

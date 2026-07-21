'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Check,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/lib/public-api';
import { resolveI18n, type TenderI18n } from '@/lib/tendersApi';
import { TenderDocumentsStep } from './TenderDocumentsStep';
import {
  tenderApplicationApi,
  type CreateTenderApplicationPayload,
  type TenderApplication,
  type TenderDocumentPayload,
} from '@/lib/tenderApplicationApi';

// Local Rwandan mobile format the user types: 0 + network prefix (72/73/78/79) + 7 digits.
const PHONE_RE = /^07[2389][0-9]{7}$/;
const TIN_RE = /^[0-9]{9}$/;
const COVER_NOTE_MAX = 2000;

/** +250781234567 (API format) → 0781234567 (what the user sees/types). */
function toLocalPhone(e164: string): string {
  return e164?.startsWith('+250') ? `0${e164.slice(4)}` : e164;
}

/** 0781234567 (what the user types) → +250781234567 (API format). */
function toE164Phone(local: string): string {
  return local?.startsWith('0') ? `+250${local.slice(1)}` : local;
}

// Zod messages are i18n *keys*, resolved through t() at render — never English literals.
const step1Schema = z.object({
  tenderId: z.string().uuid('tenderRequired'),
  companyName: z.string().min(2, 'tooShort').max(200, 'tooLong'),
  companyTin: z.string().regex(TIN_RE, 'tinFormat'),
  contactName: z.string().min(3, 'tooShort').max(150, 'tooLong'),
});
type Step1Data = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  phone: z.string().regex(PHONE_RE, 'phoneFormat'),
  email: z.string().email('invalidEmail').optional().or(z.literal('')),
  districtId: z.string().optional().or(z.literal('')),
  sectorId: z.string().optional().or(z.literal('')),
  cell: z.string().max(100).optional().or(z.literal('')),
  village: z.string().max(100).optional().or(z.literal('')),
  bidAmount: z.string().optional().or(z.literal('')),
  coverNote: z.string().max(COVER_NOTE_MAX).optional().or(z.literal('')),
});
type Step2Data = z.infer<typeof step2Schema>;

type District = { id: string; name: string };
type Sector = { id: string; name: string };
type OpenTender = { id: string; title: string; titleI18n: TenderI18n | null };
type WizardPhase = 1 | 2 | 3 | 'done';

interface Props {
  /** When editing an existing bid, pre-fills every step and calls update() instead of create(). */
  editApplication?: TenderApplication;
  /** Pre-selects a tender (deep link from a tender detail page) and locks the picker. */
  lockedTenderId?: string;
}

// ─── Progress header (Company → Contact & Bid → Documents) ─────────────────────

function WizardProgress({
  phase,
  t,
}: {
  phase: WizardPhase;
  t: ReturnType<typeof useTranslations>;
}) {
  const steps: { key: Exclude<WizardPhase, 'done'>; label: string }[] = [
    { key: 1, label: t('step1Title') },
    { key: 2, label: t('step2Title') },
    { key: 3, label: t('step3Title') },
  ];
  const currentIndex = phase === 'done' ? steps.length : steps.findIndex((s) => s.key === phase);

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
                  ? 'bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md'
                  : done
                    ? 'bg-rmc-green text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span
              className={`text-xs sm:text-sm font-medium hidden sm:inline ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px transition-colors ${done ? 'bg-rmc-green' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TenderApplicationWizard({ editApplication, lockedTenderId }: Props) {
  const t = useTranslations('services.tender.apply');

  // Seeded lazily in the useState initializer, never in a post-mount effect:
  // react-hook-form reads `defaultValues` exactly once, at mount, so a value
  // that arrives one render later is silently ignored and the edit form stays
  // blank. (Same trap the Good Conduct wizard documents.)
  const [phase, setPhase] = useState<WizardPhase>(1);
  const [step1Data, setStep1Data] = useState<Partial<Step1Data>>(() =>
    editApplication
      ? {
          tenderId: editApplication.tenderId,
          companyName: editApplication.companyName,
          companyTin: editApplication.companyTin,
          contactName: editApplication.contactName,
        }
      : { tenderId: lockedTenderId ?? '' },
  );
  const [step2Data, setStep2Data] = useState<Partial<Step2Data>>(() =>
    editApplication
      ? {
          phone: toLocalPhone(editApplication.phone),
          email: editApplication.email ?? '',
          districtId: editApplication.districtId ?? '',
          sectorId: editApplication.sectorId ?? '',
          cell: editApplication.cell ?? '',
          village: editApplication.village ?? '',
          bidAmount: editApplication.bidAmount != null ? String(editApplication.bidAmount) : '',
          coverNote: editApplication.coverNote ?? '',
        }
      : {},
  );

  const [application, setApplication] = useState<TenderApplication | null>(
    editApplication ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDocumentsSubmit = async (documents: TenderDocumentPayload[]) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateTenderApplicationPayload = {
        tenderId: step1Data.tenderId!,
        companyName: step1Data.companyName!,
        companyTin: step1Data.companyTin!,
        contactName: step1Data.contactName!,
        phone: toE164Phone(step2Data.phone!),
        email: step2Data.email || undefined,
        districtId: step2Data.districtId || undefined,
        sectorId: step2Data.sectorId || undefined,
        cell: step2Data.cell || undefined,
        village: step2Data.village || undefined,
        bidAmount: step2Data.bidAmount ? Number(step2Data.bidAmount) : undefined,
        coverNote: step2Data.coverNote || undefined,
        documents,
      };

      const saved = editApplication
        ? await tenderApplicationApi.update(editApplication.id, payload)
        : await tenderApplicationApi.create(payload);

      setApplication(saved);
      setPhase('done');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || t('genericError');
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'done' && application) {
    return <SuccessScreen application={application} isEdit={!!editApplication} />;
  }

  return (
    <div className="space-y-6">
      <WizardProgress phase={phase} t={t} />

      {submitError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3"
        >
          {submitError}
        </div>
      )}

      {phase === 1 && (
        <Step1Company
          initialData={step1Data}
          lockedTenderId={lockedTenderId ?? (editApplication ? editApplication.tenderId : undefined)}
          onNext={(data) => {
            setStep1Data(data);
            setPhase(2);
          }}
        />
      )}

      {phase === 2 && (
        <Step2Contact
          initialData={step2Data}
          onBack={() => setPhase(1)}
          onNext={(data) => {
            setStep2Data(data);
            setPhase(3);
          }}
        />
      )}

      {phase === 3 && (
        <TenderDocumentsStep
          initialDocuments={editApplication?.documents}
          submitting={submitting}
          onBack={() => setPhase(2)}
          onSubmit={handleDocumentsSubmit}
        />
      )}
    </div>
  );
}

// ─── Step 1: Tender + company ──────────────────────────────────────────────────

function Step1Company({
  initialData,
  lockedTenderId,
  onNext,
}: {
  initialData: Partial<Step1Data>;
  lockedTenderId?: string;
  onNext: (data: Step1Data) => void;
}) {
  const t = useTranslations('services.tender.apply');
  const { locale } = useParams<{ locale: string }>();
  const [tenders, setTenders] = useState<OpenTender[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: initialData,
  });

  useEffect(() => {
    // Only tenders still open for bidding — `includeExpired: false` keeps closed
    // ones out of the picker, and the backend re-checks the deadline on submit
    // anyway, so a stale tab can't slip a late bid through.
    publicApi
      .getAnnouncements('tender', 100, false)
      .then((items) =>
        setTenders(
          items.map((i) => ({
            id: i.id,
            title: i.title,
            titleI18n: i.titleI18n,
          })),
        ),
      )
      .catch(() => setTenders([]));
  }, []);

  const lockedTender = lockedTenderId ? tenders.find((x) => x.id === lockedTenderId) : undefined;

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      noValidate
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5"
    >
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-rmc-green" /> {t('step1Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step1Subtitle')}</p>
      </div>

      {lockedTenderId ? (
        <div className="rounded-xl bg-rmc-green-light border border-rmc-green-light px-4 py-3">
          <p className="text-xs text-rmc-green-dark font-medium">{t('tenderLabel')}</p>
          <p className="text-sm font-semibold text-rmc-green-dark mt-0.5">
            {lockedTender
              ? resolveI18n(lockedTender.titleI18n, lockedTender.title, locale)
              : t('tenderLoading')}
          </p>
          <input type="hidden" value={lockedTenderId} {...register('tenderId')} />
        </div>
      ) : (
        <Select
          label={t('tenderLabel')}
          required
          placeholder={t('tenderPlaceholder')}
          {...register('tenderId')}
          error={errors.tenderId && t('tenderRequiredError')}
          options={tenders.map((x) => ({
            value: x.id,
            label: resolveI18n(x.titleI18n, x.title, locale),
          }))}
        />
      )}

      <Input
        label={t('companyName')}
        required
        maxLength={200}
        {...register('companyName')}
        error={errors.companyName && t('companyNameError')}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label={t('companyTin')}
          required
          placeholder="102345678"
          maxLength={9}
          inputMode="numeric"
          {...register('companyTin')}
          error={errors.companyTin && t('tinFormatError')}
          hint={!errors.companyTin ? t('tinHint') : undefined}
        />
        <Input
          label={t('contactName')}
          required
          maxLength={150}
          {...register('contactName')}
          error={errors.contactName && t('contactNameError')}
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

// ─── Step 2: Contact, address cascade, bid ─────────────────────────────────────

function Step2Contact({
  initialData,
  onBack,
  onNext,
}: {
  initialData: Partial<Step2Data>;
  onBack: () => void;
  onNext: (data: Step2Data) => void;
}) {
  const t = useTranslations('services.tender.apply');
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
  const coverNoteValue = watch('coverNote') ?? '';

  useEffect(() => {
    publicApi
      .getDistricts()
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!districtId) {
      setSectors([]);
      return;
    }
    publicApi
      .getSectors(districtId)
      .then(setSectors)
      .catch(() => setSectors([]));
  }, [districtId]);

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      noValidate
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5"
    >
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rmc-green" /> {t('step2Title')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('step2Subtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label={t('phone')}
          required
          placeholder="0781234567"
          maxLength={10}
          {...register('phone')}
          error={errors.phone && t('phoneFormatError')}
          hint={!errors.phone ? t('phoneHint') : undefined}
        />
        <Input
          label={`${t('email')} (${t('optional')})`}
          type="email"
          {...register('email')}
          error={errors.email && t('emailError')}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label={`${t('district')} (${t('optional')})`}
          placeholder={t('districtPlaceholder')}
          {...register('districtId', {
            // Clearing the sector is what makes this a cascade — a sector from
            // the previously-picked district would otherwise stay selected and
            // be submitted with the wrong district.
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

      {/* Cell and Village have no master data — free text, same as Good Conduct. */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label={`${t('cell')} (${t('optional')})`} maxLength={100} {...register('cell')} />
        <Input
          label={`${t('village')} (${t('optional')})`}
          maxLength={100}
          {...register('village')}
        />
      </div>

      <Input
        label={`${t('bidAmount')} (${t('optional')})`}
        type="number"
        min={0}
        inputMode="numeric"
        {...register('bidAmount')}
        rightAddon="RWF"
        hint={t('bidAmountHint')}
      />

      <Textarea
        label={`${t('coverNote')} (${t('optional')})`}
        rows={4}
        maxLength={COVER_NOTE_MAX}
        {...register('coverNote')}
        hint={`${coverNoteValue.length}/${COVER_NOTE_MAX}`}
      />

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          {t('back')}
        </Button>
        <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
          {t('next')}
        </Button>
      </div>
    </form>
  );
}

// ─── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  application,
  isEdit,
}: {
  application: TenderApplication;
  isEdit: boolean;
}) {
  const t = useTranslations('services.tender.apply');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    navigator.clipboard.writeText(application.applicationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>

      <h2 className="text-xl font-bold text-gray-900">
        {isEdit ? t('successEditTitle') : t('successTitle')}
      </h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
        {isEdit ? t('successEditText') : t('successText')}
      </p>

      <div>
        <p className="text-xs text-gray-400 mb-1.5">{t('yourReference')}</p>
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <code className="text-sm font-mono font-semibold text-rmc-green-dark">
            {application.applicationNumber}
          </code>
          <button
            onClick={copyRef}
            aria-label={t('copyReference')}
            className="text-gray-400 hover:text-gray-600"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button onClick={() => router.push(`/${locale}/services/tender/status`)}>
          {t('checkStatusBtn')}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/${locale}/tenders`)}>
          {t('browseMoreBtn')}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import {
  UserRound, MapPin, BookUser, Receipt, Banknote, Upload,
  Check, CheckCircle2, Loader2, X, FileCheck2, ArrowLeft, ArrowRight, Eye,
} from 'lucide-react';
import {
  hajjApi,
  HAJJ_PROOF_ACCEPT,
  HAJJ_PROOF_MAX_BYTES,
  HAJJ_FEE_KEYS,
  type HajjCurrency,
  type UploadedProof,
} from '@/lib/hajjApi';
import { publicApi } from '@/lib/public-api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FilePreviewTrigger } from '@/components/ui/FilePreviewOverlay';
import { cn } from '@/lib/utils';

/**
 * Hajj registration, as a multi-step wizard — the same shape as the Scholarship
 * application (stepper + one StepShell card per step + Back/Next nav), so every
 * public form on the site reads as one product. The steps are: Applicant &
 * contact → Residence → Passport → Payments. Each step owns its own form/schema
 * and hands validated data up; the parent holds the cross-step state that must
 * survive Back/Next — the residence selects, the uploaded proofs and the fees.
 */

/**
 * Last-resort fallbacks, used only if the requirements CMS is unreachable — the
 * live amounts and currencies come from the requirements themselves (keyed by
 * HAJJ_FEE_KEYS), so an admin editing a fee changes the landing page and this
 * form together.
 */
const REGISTRATION_FEE: Fee = { amount: 40_000, currency: 'RWF' };
const ADVANCE_PAYMENT: Fee = { amount: 400_000, currency: 'RWF' };

/** A fee as the applicant sees it: an amount plus the currency it is quoted in. */
interface Fee {
  amount: number;
  currency: HajjCurrency;
}

// Rwandan phone: 07XXXXXXXX; accepts +250/250 and normalizes to local.
const RW_PHONE = /^07\d{8}$/;
const PASSPORT = /^[A-Za-z0-9]{5,15}$/;
const normalizeRwPhone = (v: string) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.startsWith('250') ? `0${d.slice(3)}` : d;
};

// ── Per-step schemas ─────────────────────────────────────────────────────────
function step1Schema(tr: (k: string) => string) {
  return z.object({
    fullName: z.string().trim().min(2, tr('validation.required')),
    phone: z.string().trim().min(1, tr('validation.required'))
      .refine((v) => RW_PHONE.test(normalizeRwPhone(v)), tr('validation.phone')),
    email: z.string().trim().email(tr('validation.email')).optional().or(z.literal('')),
  });
}
function step3Schema(tr: (k: string) => string) {
  return z.object({
    passportNumber: z.string().trim().min(1, tr('validation.required'))
      .refine((v) => PASSPORT.test(v), tr('validation.passport')),
  });
}

type Step1Values = z.infer<ReturnType<typeof step1Schema>>;
type Step3Values = z.infer<ReturnType<typeof step3Schema>>;

type Phase = 1 | 2 | 3 | 4;

export function HajjRegisterForm() {
  const t = useTranslations('services.hajj.register');
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale);

  const [phase, setPhase] = useState<Phase>(1);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step data kept in the parent so Back/Next never loses what was typed.
  const [step1, setStep1] = useState<Partial<Step1Values>>({});
  const [passport, setPassport] = useState<Partial<Step3Values>>({});

  // Residence: cascading district → sector selects (all of Rwanda, seeded).
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [sector, setSector] = useState('');
  const [residenceError, setResidenceError] = useState('');

  // The uploaded payment proofs (the file-server keys + metadata to submit).
  const [feeDoc, setFeeDoc] = useState<UploadedProof | null>(null);
  const [advanceDoc, setAdvanceDoc] = useState<UploadedProof | null>(null);

  // The fees an applicant must pay, as set in the requirements CMS.
  const [fees, setFees] = useState({ registration: REGISTRATION_FEE, advance: ADVANCE_PAYMENT });

  useEffect(() => {
    let active = true;
    hajjApi.getRequirements()
      .then((items) => {
        if (!active) return;
        // A requirement with no amount set can't state a fee, so fall back
        // rather than render "0" — but keep the CMS currency when it has one.
        const feeOf = (key: string, fallback: Fee): Fee => {
          const row = items.find((r) => r.key === key);
          if (!row || row.amount == null) return fallback;
          return { amount: row.amount, currency: row.currency };
        };
        setFees((prev) => ({
          registration: feeOf(HAJJ_FEE_KEYS.registration, prev.registration),
          advance: feeOf(HAJJ_FEE_KEYS.advance, prev.advance),
        }));
      })
      .catch(() => { /* keep the fallbacks — the form must still be usable */ });
    return () => { active = false; };
  }, []);

  // Load districts once; sectors reload whenever the chosen district changes.
  useEffect(() => {
    let active = true;
    publicApi.getDistricts()
      .then((rows) => { if (active) setDistricts(rows.map((d) => ({ id: d.id, name: d.name }))); })
      .catch(() => { if (active) setDistricts([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!districtId) { setSectors([]); return; }
    publicApi.getSectors(districtId)
      .then((rows) => { if (active) setSectors(rows.map((s) => ({ id: s.id, name: s.name }))); })
      .catch(() => { if (active) setSectors([]); });
    return () => { active = false; };
  }, [districtId]);

  const onDistrictChange = (id: string) => {
    setDistrictId(id);
    setDistrictName(districts.find((d) => d.id === id)?.name ?? '');
    setSector(''); // reset dependent sector
    setResidenceError('');
  };

  const goResidenceNext = () => {
    if (!districtName || !sector) {
      setResidenceError(t('validation.required'));
      return;
    }
    setResidenceError('');
    setPhase(3);
  };

  const finalSubmit = async () => {
    setSubmitError('');
    if (!feeDoc || !advanceDoc) {
      setSubmitError(t('validation.proof'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await hajjApi.apply({
        fullName: step1.fullName!,
        phone: normalizeRwPhone(step1.phone!),
        email: step1.email || undefined,
        district: districtName,
        sector,
        passportNumber: passport.passportNumber!,
        documents: [
          { ...feeDoc, documentType: 'registration_fee' },
          { ...advanceDoc, documentType: 'advance_payment' },
        ],
      });
      setTrackingCode(res.trackingCode);
      setSubmitted(true);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError(t('validation.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setPhase(1);
    setStep1({});
    setPassport({});
    setDistrictId('');
    setDistrictName('');
    setSector('');
    setSectors([]);
    setFeeDoc(null);
    setAdvanceDoc(null);
    setSubmitted(false);
    setTrackingCode('');
    setSubmitError('');
  };

  // ── Success ──
  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 md:py-16 text-center sm:px-6">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-light ring-4 ring-rmc-green/10">
          <CheckCircle2 className="h-8 w-8 text-rmc-green" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-gray-900">{t('success.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{t('success.message')}</p>

        {/* The tracking code is the applicant's credential — with their phone it
            is how they track the request, and how it appears in every message. */}
        {trackingCode && (
          <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {t('success.numberLabel')}
            </p>
            <p className="mt-1 text-lg font-bold tracking-wide text-rmc-green">{trackingCode}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{t('success.numberHint')}</p>
            <Link
              href={`/${locale}/services/hajj/status`}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-rmc-green px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rmc-green-dark"
            >
              {t('success.track')}
            </Link>
          </div>
        )}

        <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            {t('success.again')}
          </button>
          <Link
            href={`/${locale}/services/hajj`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            {t('success.home')}
          </Link>
        </div>
      </div>
    );
  }

  const stepLabels = [
    t('sections.personal'),
    t('sections.residence'),
    t('sections.passport'),
    t('sections.payments'),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <WizardProgress labels={stepLabels} current={phase} />

      {phase === 1 && (
        <Step1PersonalContact
          initialData={step1}
          onNext={(d) => { setStep1(d); setPhase(2); }}
        />
      )}

      {phase === 2 && (
        <Step2Residence
          districtId={districtId}
          districts={districts}
          sectors={sectors}
          sector={sector}
          onDistrictChange={onDistrictChange}
          onSectorChange={(v) => { setSector(v); setResidenceError(''); }}
          error={residenceError}
          onBack={() => setPhase(1)}
          onNext={goResidenceNext}
        />
      )}

      {phase === 3 && (
        <Step3Passport
          initialData={passport}
          onBack={() => setPhase(2)}
          onNext={(d) => { setPassport(d); setPhase(4); }}
        />
      )}

      {phase === 4 && (
        <Step4Payments
          fees={fees}
          money={money}
          feeDoc={feeDoc}
          advanceDoc={advanceDoc}
          onFeeDoc={setFeeDoc}
          onAdvanceDoc={setAdvanceDoc}
          submitting={submitting}
          submitError={submitError}
          onBack={() => setPhase(3)}
          onSubmit={finalSubmit}
        />
      )}
    </div>
  );
}

// ── Wizard chrome (mirrors the Scholarship wizard) ────────────────────────────

function WizardProgress({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3" role="list">
      {labels.map((label, i) => {
        const done = i < current - 1;
        const active = i === current - 1;
        return (
          <div key={label} className="flex items-center gap-2 flex-1" role="listitem">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                active
                  ? 'bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md'
                  : done
                    ? 'bg-rmc-green text-white'
                    : 'bg-gray-100 text-gray-400',
              )}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={cn('text-xs sm:text-sm font-medium hidden sm:inline', active ? 'text-gray-900' : 'text-gray-400')}>
              {label}
            </span>
            {i < labels.length - 1 && (
              <div className={cn('flex-1 h-px transition-colors', done ? 'bg-rmc-green' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepShell({
  icon, title, children,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        <span className="text-rmc-green">{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function Step1PersonalContact({
  initialData, onNext,
}: {
  initialData: Partial<Step1Values>;
  onNext: (data: Step1Values) => void;
}) {
  const t = useTranslations('services.hajj.register');
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema((k) => t(k))) as Resolver<Step1Values>,
    mode: 'onTouched',
    defaultValues: { fullName: '', phone: '', email: '', ...initialData },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell icon={<UserRound className="w-4 h-4" />} title={t('sections.personal')}>
        <Input
          label={t('fields.fullName')}
          required
          {...register('fullName')}
          error={errors.fullName?.message}
          hint={!errors.fullName ? t('fields.fullNameHint') : undefined}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t('fields.phone')}
            required
            type="tel"
            inputMode="tel"
            placeholder="07XXXXXXXX"
            {...register('phone')}
            error={errors.phone?.message}
            hint={!errors.phone ? t('fields.phoneHint') : undefined}
          />
          <Input
            label={t('fields.email')}
            type="email"
            {...register('email')}
            error={errors.email?.message}
            hint={!errors.email ? t('fields.emailHint') : undefined}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('nav.next')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

function Step2Residence({
  districtId, districts, sectors, sector, onDistrictChange, onSectorChange, error, onBack, onNext,
}: {
  districtId: string;
  districts: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  sector: string;
  onDistrictChange: (id: string) => void;
  onSectorChange: (v: string) => void;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations('services.hajj.register');
  return (
    <StepShell icon={<MapPin className="w-4 h-4" />} title={t('sections.residence')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label={t('fields.district')} required error={error && !districtId ? error : undefined}>
          <SearchableSelect
            value={districtId}
            onChange={onDistrictChange}
            options={districts.map((d) => ({ value: d.id, label: d.name }))}
            placeholder={t('fields.selectDistrict')}
            searchPlaceholder={t('fields.searchPlaceholder')}
            zIndex={45}
            size="md"
            triggerClassName={cn(error && !districtId && '!border-red-400')}
          />
        </SelectField>
        <SelectField label={t('fields.sector')} required error={error && !sector ? error : undefined}>
          <SearchableSelect
            value={sector}
            onChange={onSectorChange}
            options={sectors.map((s) => ({ value: s.name, label: s.name }))}
            disabled={!districtId}
            placeholder={t(districtId ? 'fields.selectSector' : 'fields.selectDistrictFirst')}
            searchPlaceholder={t('fields.searchPlaceholder')}
            zIndex={45}
            size="md"
            triggerClassName={cn(error && !sector && '!border-red-400')}
          />
        </SelectField>
      </div>
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          {t('nav.back')}
        </Button>
        <Button type="button" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          {t('nav.next')}
        </Button>
      </div>
    </StepShell>
  );
}

function Step3Passport({
  initialData, onBack, onNext,
}: {
  initialData: Partial<Step3Values>;
  onBack: () => void;
  onNext: (data: Step3Values) => void;
}) {
  const t = useTranslations('services.hajj.register');
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema((k) => t(k))) as Resolver<Step3Values>,
    mode: 'onTouched',
    defaultValues: { passportNumber: '', ...initialData },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <StepShell icon={<BookUser className="w-4 h-4" />} title={t('sections.passport')}>
        <Input
          label={t('fields.passportNumber')}
          required
          {...register('passportNumber')}
          error={errors.passportNumber?.message}
          hint={!errors.passportNumber ? t('fields.passportHint') : undefined}
        />
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
            {t('nav.back')}
          </Button>
          <Button type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('nav.next')}
          </Button>
        </div>
      </StepShell>
    </form>
  );
}

function Step4Payments({
  fees, money, feeDoc, advanceDoc, onFeeDoc, onAdvanceDoc, submitting, submitError, onBack, onSubmit,
}: {
  fees: { registration: Fee; advance: Fee };
  money: Intl.NumberFormat;
  feeDoc: UploadedProof | null;
  advanceDoc: UploadedProof | null;
  onFeeDoc: (d: UploadedProof | null) => void;
  onAdvanceDoc: (d: UploadedProof | null) => void;
  submitting: boolean;
  submitError: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations('services.hajj.register');
  return (
    <StepShell icon={<Receipt className="w-4 h-4" />} title={t('sections.payments')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProofField
          icon={Receipt}
          label={t('fields.registrationFee')}
          amount={`${money.format(fees.registration.amount)} ${fees.registration.currency}`}
          uploadLabel={t('fields.uploadProof')}
          uploaded={feeDoc}
          onUploaded={onFeeDoc}
        />
        <ProofField
          icon={Banknote}
          label={t('fields.advancePayment')}
          amount={`${money.format(fees.advance.amount)} ${fees.advance.currency}`}
          uploadLabel={t('fields.uploadProof')}
          uploaded={advanceDoc}
          onUploaded={onAdvanceDoc}
        />
      </div>

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
          <X className="h-4 w-4" aria-hidden="true" /> {submitError}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} disabled={submitting}>
          {t('nav.back')}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          isLoading={submitting}
          rightIcon={!submitting ? <Check className="w-4 h-4" /> : undefined}
        >
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </div>
    </StepShell>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

/** A labelled wrapper for a non-<input> control (the residence selects), matching
 *  the ui/Input label + error styling so the wizard reads consistently. */
function SelectField({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1.5 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

function prettySize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * A payment proof row: the fixed amount + a real upload. The receipt is sent to
 * the server as soon as it is picked, so by the time the form is submitted we are
 * holding a stored file the admin can open — not just a filename.
 */
function ProofField({
  icon: Icon, label, amount, uploadLabel, uploaded, onUploaded,
}: {
  icon: React.ElementType;
  label: string;
  amount: string;
  uploadLabel: string;
  uploaded: UploadedProof | null;
  onUploaded: (doc: UploadedProof | null) => void;
}) {
  const t = useTranslations('services.hajj.register');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // The receipt is uploaded the moment it is picked, and stored receipts are not
  // publicly readable — so the local File is the only copy we can show back to
  // the applicant. Held here purely for the preview; it is never submitted.
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Covers the parent clearing the proof (a failed submit reset, "Apply again"),
  // which would otherwise leave a preview pointing at a receipt no longer held.
  useEffect(() => {
    if (!uploaded) setLocalFile(null);
  }, [uploaded]);

  const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploadError('');

    // Fail fast in the browser; the backend enforces the same rules again.
    if (file.size > HAJJ_PROOF_MAX_BYTES) {
      setUploadError(t('validation.proofTooLarge'));
      return;
    }
    if (!HAJJ_PROOF_ACCEPT.split(',').includes(file.type)) {
      setUploadError(t('validation.proofType'));
      return;
    }

    setBusy(true);
    setPct(0);
    try {
      onUploaded(await hajjApi.uploadProof(file, setPct));
      setLocalFile(file);
    } catch {
      setUploadError(t('validation.proofUploadFailed'));
      onUploaded(null);
      setLocalFile(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
          <Icon className="h-4 w-4 text-rmc-green" aria-hidden="true" /> {label} <span className="text-red-500">*</span>
        </span>
        <span className="inline-flex items-center rounded-lg bg-rmc-gold/20 px-2.5 py-0.5 text-[12px] font-bold text-rmc-green-deep">
          {amount}
        </span>
      </div>

      {uploaded ? (
        <div className="flex items-center gap-3 rounded-lg border border-rmc-green/30 bg-rmc-green-light/40 px-3.5 py-3 text-sm">
          <FileCheck2 className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-gray-900">{uploaded.fileName}</span>
            <span className="block text-[11.5px] text-gray-500">{prettySize(uploaded.fileSize)} · {t('fields.proofUploaded')}</span>
          </span>
          <FilePreviewTrigger
            file={localFile}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-rmc-green"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </FilePreviewTrigger>
          <button
            type="button"
            onClick={() => onUploaded(null)}
            aria-label={t('fields.proofRemove')}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className={cx(
          'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3.5 py-3 text-sm transition-colors',
          uploadError ? 'border-red-400 text-red-500' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-rmc-green/40 hover:text-rmc-green',
          busy && 'cursor-wait',
        )}>
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{busy ? `${t('fields.proofUploading')} ${pct}%` : uploadLabel}</span>
          <input
            type="file"
            accept={HAJJ_PROOF_ACCEPT}
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = ''; // allow re-picking the same file after a failure
            }}
          />
        </label>
      )}

      {!uploaded && !busy && !uploadError && (
        <p className="mt-1 text-[11.5px] text-gray-400">{t('fields.proofHint')}</p>
      )}
      {uploadError && (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
          <X className="h-3 w-3 shrink-0" aria-hidden="true" /> {uploadError}
        </p>
      )}
    </div>
  );
}

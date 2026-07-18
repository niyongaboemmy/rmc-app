'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import {
  UserRound, Phone, MapPin, BookUser, Receipt, Banknote, Upload,
  Check, CheckCircle2, Loader2, X, FileCheck2,
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

function buildSchema(tr: (k: string) => string) {
  return z.object({
    fullName: z.string().trim().min(2, tr('validation.required')),
    phone: z.string().trim().min(1, tr('validation.required'))
      .refine((v) => RW_PHONE.test(normalizeRwPhone(v)), tr('validation.phone')),
    email: z.string().trim().email(tr('validation.email')).optional().or(z.literal('')),
    district: z.string().trim().min(1, tr('validation.required')),
    sector: z.string().trim().min(1, tr('validation.required')),
    passportNumber: z.string().trim().min(1, tr('validation.required'))
      .refine((v) => PASSPORT.test(v), tr('validation.passport')),
    registrationFeeProof: z.string().min(1, tr('validation.proof')),
    advancePaymentProof: z.string().min(1, tr('validation.proof')),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30';
const inputError = 'border-red-300 focus:border-red-400 focus:ring-red-400/30';
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function HajjRegisterForm() {
  const t = useTranslations('services.hajj.register');
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale);

  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [submitError, setSubmitError] = useState('');

  // The fees an applicant must pay, as set in the requirements CMS.
  const [fees, setFees] = useState({
    registration: REGISTRATION_FEE,
    advance: ADVANCE_PAYMENT,
  });

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

  // Residence: cascading district → sector selects (all of Rwanda, seeded).
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [districtId, setDistrictId] = useState('');

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema((k) => t(k))) as Resolver<FormValues>,
    mode: 'onTouched',
    defaultValues: {
      fullName: '', phone: '', email: '', district: '', sector: '',
      passportNumber: '', registrationFeeProof: '', advancePaymentProof: '',
    },
  });

  // The form fields hold the file-server KEY; the metadata lives here so we can
  // show the applicant what they actually attached and submit it with the form.
  const [feeDoc, setFeeDoc] = useState<UploadedProof | null>(null);
  const [advanceDoc, setAdvanceDoc] = useState<UploadedProof | null>(null);

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
    setValue('district', districts.find((d) => d.id === id)?.name ?? '', { shouldValidate: true });
    setValue('sector', '', { shouldValidate: false }); // reset dependent sector
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    if (!feeDoc || !advanceDoc) {
      setSubmitError(t('validation.proof'));
      return;
    }
    try {
      const { registrationFeeProof: _fee, advancePaymentProof: _advance, ...fields } = data;
      const res = await hajjApi.apply({
        ...fields,
        phone: normalizeRwPhone(data.phone),
        email: data.email || undefined,
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
    }
  };

  // ── Success ──
  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-light ring-4 ring-rmc-green/10">
          <CheckCircle2 className="h-8 w-8 text-rmc-green" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-gray-900">{t('success.title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{t('success.message')}</p>

        {/* The tracking code is the applicant's credential — with their phone it
            is how they track the request, and how it appears in every message. */}
        {trackingCode && (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {t('success.numberLabel')}
            </p>
            <p className="mt-1 text-lg font-bold tracking-wide text-rmc-green">{trackingCode}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{t('success.numberHint')}</p>
            <Link
              href={`/${locale}/services/hajj/status`}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-rmc-green px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rmc-green-dark"
            >
              {t('success.track')}
            </Link>
          </div>
        )}

        <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => { reset(); setDistrictId(''); setSectors([]); setSubmitted(false); setTrackingCode(''); }}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            {t('success.again')}
          </button>
          <Link
            href={`/${locale}/services/hajj`}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            {t('success.home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      {/* Applicant */}
      <SectionCard icon={UserRound} title={t('sections.personal')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('fields.fullName')} required error={errors.fullName?.message} hint={t('fields.fullNameHint')} className="sm:col-span-2">
            <input className={cx(inputClass, errors.fullName && inputError)} {...register('fullName')} />
          </Field>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard icon={Phone} title={t('sections.contact')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('fields.phone')} required error={errors.phone?.message} hint={t('fields.phoneHint')}>
            <input type="tel" inputMode="tel" placeholder="07XXXXXXXX" className={cx(inputClass, errors.phone && inputError)} {...register('phone')} />
          </Field>
          <Field label={t('fields.email')} error={errors.email?.message} hint={t('fields.emailHint')}>
            <input type="email" className={cx(inputClass, errors.email && inputError)} {...register('email')} />
          </Field>
        </div>
      </SectionCard>

      {/* Residence */}
      <SectionCard icon={MapPin} title={t('sections.residence')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('fields.district')} required error={errors.district?.message}>
            <SearchableSelect
              value={districtId}
              onChange={onDistrictChange}
              options={districts.map((d) => ({ value: d.id, label: d.name }))}
              placeholder={t('fields.selectDistrict')}
              searchPlaceholder={t('fields.searchPlaceholder')}
              zIndex={45}
              size="md"
              triggerClassName={cx(errors.district && '!border-red-300')}
            />
          </Field>
          <Field label={t('fields.sector')} required error={errors.sector?.message}>
            <SearchableSelect
              value={watch('sector')}
              onChange={(v) => setValue('sector', v, { shouldValidate: true })}
              options={sectors.map((s) => ({ value: s.name, label: s.name }))}
              disabled={!districtId}
              placeholder={t(districtId ? 'fields.selectSector' : 'fields.selectDistrictFirst')}
              searchPlaceholder={t('fields.searchPlaceholder')}
              zIndex={45}
              size="md"
              triggerClassName={cx(errors.sector && '!border-red-300')}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Passport */}
      <SectionCard icon={BookUser} title={t('sections.passport')}>
        <Field label={t('fields.passportNumber')} required error={errors.passportNumber?.message} hint={t('fields.passportHint')}>
          <input className={cx(inputClass, errors.passportNumber && inputError)} {...register('passportNumber')} />
        </Field>
      </SectionCard>

      {/* Payments */}
      <SectionCard icon={Receipt} title={t('sections.payments')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProofField
            icon={Receipt}
            label={t('fields.registrationFee')}
            amount={`${money.format(fees.registration.amount)} ${fees.registration.currency}`}
            uploadLabel={t('fields.uploadProof')}
            error={errors.registrationFeeProof?.message}
            uploaded={feeDoc}
            onUploaded={(doc) => {
              setFeeDoc(doc);
              setValue('registrationFeeProof', doc?.fileKey ?? '', { shouldValidate: true });
            }}
          />
          <ProofField
            icon={Banknote}
            label={t('fields.advancePayment')}
            amount={`${money.format(fees.advance.amount)} ${fees.advance.currency}`}
            uploadLabel={t('fields.uploadProof')}
            error={errors.advancePaymentProof?.message}
            uploaded={advanceDoc}
            onUploaded={(doc) => {
              setAdvanceDoc(doc);
              setValue('advancePaymentProof', doc?.fileKey ?? '', { shouldValidate: true });
            }}
          />
        </div>
      </SectionCard>

      {submitError && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
          <X className="h-4 w-4" aria-hidden="true" /> {submitError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-7 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
        <Icon className="h-4 w-4 text-rmc-green" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label, hint, error, required, className, children,
}: {
  label: string; hint?: string; error?: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
          <X className="h-3 w-3 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-gray-400">{hint}</p>
      ) : null}
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
  icon: Icon, label, amount, uploadLabel, error, uploaded, onUploaded,
}: {
  icon: React.ElementType;
  label: string;
  amount: string;
  uploadLabel: string;
  error?: string;
  uploaded: UploadedProof | null;
  onUploaded: (doc: UploadedProof | null) => void;
}) {
  const t = useTranslations('services.hajj.register');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [uploadError, setUploadError] = useState('');

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
    } catch {
      setUploadError(t('validation.proofUploadFailed'));
      onUploaded(null);
    } finally {
      setBusy(false);
    }
  };

  const shownError = uploadError || error;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
          <Icon className="h-4 w-4 text-rmc-green" aria-hidden="true" /> {label} <span className="text-red-500">*</span>
        </span>
        <span className="inline-flex items-center rounded-full bg-rmc-gold/20 px-2.5 py-0.5 text-[12px] font-bold text-rmc-green-deep">
          {amount}
        </span>
      </div>

      {uploaded ? (
        <div className="flex items-center gap-3 rounded-xl border border-rmc-green/30 bg-rmc-green-light/40 px-3.5 py-3 text-sm">
          <FileCheck2 className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-gray-900">{uploaded.fileName}</span>
            <span className="block text-[11.5px] text-gray-500">{prettySize(uploaded.fileSize)} · {t('fields.proofUploaded')}</span>
          </span>
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
          'flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-sm transition-colors',
          shownError ? 'border-red-300 text-red-500' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-rmc-green/40 hover:text-rmc-green',
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

      {!uploaded && !busy && !shownError && (
        <p className="mt-1 text-[11.5px] text-gray-400">{t('fields.proofHint')}</p>
      )}
      {shownError && (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
          <X className="h-3 w-3 shrink-0" aria-hidden="true" /> {shownError}
        </p>
      )}
    </div>
  );
}

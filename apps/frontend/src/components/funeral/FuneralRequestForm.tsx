'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, Loader2, Upload, X,
} from 'lucide-react';
import {
  funeralApi,
  FUNERAL_DOC_ACCEPT,
  FUNERAL_DOC_MAX_BYTES,
  type UploadedFuneralDocument,
} from '@/lib/funeralApi';
import { mosqueApi } from '@/lib/mosqueApi';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { Cemetery } from './types';

// Rwandan phone: 10 digits starting 07 (e.g. 0788123456). National ID: 16 digits.
const RW_PHONE = /^07\d{8}$/;
const NATIONAL_ID = /^\d{16}$/;
export const digitsOnly = (v: string) => (v ?? '').replace(/\D/g, '');
// Accept local (0788…) or international (+250788… / 250788…) and store as local.
export const normalizeRwPhone = (v: string) => {
  const d = digitsOnly(v);
  return d.startsWith('250') ? `0${d.slice(3)}` : d;
};
const todayISO = () => new Date().toISOString().slice(0, 10);

// Schema factory — takes a translator so messages are localized. Called at
// module scope with an identity fn purely to derive the TS type.
function buildSchema(tr: (k: string) => string) {
  return z.object({
    deceased: z.object({
      fullName: z.string().trim().min(2, tr('validation.required')),
      gender: z.enum(['male', 'female'], { errorMap: () => ({ message: tr('validation.selectGender') }) }),
      dateOfBirth: z.string().min(1, tr('validation.required')),
      dateOfDeath: z.string().min(1, tr('validation.required'))
        .refine((d) => !d || d <= todayISO(), tr('validation.dateOfDeathFuture')),
      nationalId: z.string().trim().min(1, tr('validation.required'))
        .refine((v) => NATIONAL_ID.test(digitsOnly(v)), tr('validation.nationalId')),
      placeOfDeath: z.string().trim().min(1, tr('validation.required')),
      causeOfDeath: z.string().trim().optional(),
      deathCertificate: z.string().optional(),
    }),
    family: z.object({
      nextOfKin: z.string().trim().min(2, tr('validation.required')),
      phone: z.string().trim().min(1, tr('validation.required'))
        .refine((v) => RW_PHONE.test(normalizeRwPhone(v)), tr('validation.phone')),
      email: z.string().trim().email(tr('validation.email')).optional().or(z.literal('')),
      address: z.string().trim().min(2, tr('validation.required')),
      emergencyContact: z.string().trim()
        .refine((v) => !v || RW_PHONE.test(normalizeRwPhone(v)), tr('validation.phone'))
        .optional(),
    }),
    arrangements: z.object({
      preferredMosque: z.string().optional(),
      preferredCemetery: z.string().optional(),
      preferredBurialDate: z.string().optional(),
      preferredBurialTime: z.string().optional(),
      transportationRequired: z.boolean(),
      notes: z.string().optional(),
    }),
  }).superRefine((val, ctx) => {
    const death = val.deceased?.dateOfDeath;
    // Date of birth must be before the date of death.
    const birth = val.deceased?.dateOfBirth;
    if (death && birth && birth > death) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deceased', 'dateOfBirth'],
        message: tr('validation.dobBeforeDeath'),
      });
    }
    // Burial cannot be scheduled before the date of death.
    const burial = val.arrangements?.preferredBurialDate;
    if (death && burial && burial < death) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['arrangements', 'preferredBurialDate'],
        message: tr('validation.burialBeforeDeath'),
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30';
const inputError = 'border-red-300 focus:border-red-400 focus:ring-red-400/30';

const STEP_KEYS = ['deceased', 'family', 'arrangements', 'review'] as const;

// Fields validated before leaving each step (optional fields omitted).
const STEP_FIELDS: Record<number, (keyof FormValues | `${string}.${string}`)[]> = {
  0: ['deceased.fullName', 'deceased.gender', 'deceased.dateOfBirth', 'deceased.dateOfDeath', 'deceased.nationalId', 'deceased.placeOfDeath'],
  1: ['family.nextOfKin', 'family.phone', 'family.email', 'family.address', 'family.emergencyContact'],
  2: ['arrangements.preferredBurialDate'],
};


export function FuneralRequestForm({ locale }: { locale: string }) {
  const t = useTranslations('services.funeral.request');
  const schema = useMemo(() => buildSchema((k) => t(k)), [t]);

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Holds the STORED certificate (key + metadata) so the admin can open the real
  // file — previously only the filename was kept and the file was thrown away.
  const [certificate, setCertificate] = useState<UploadedFuneralDocument | null>(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certPct, setCertPct] = useState(0);
  const [certError, setCertError] = useState('');
  const [mosques, setMosques] = useState<{ id: string; name: string }[]>([]);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);

  // Real mosques + cemeteries for the preferred pickers (public endpoints).
  useEffect(() => {
    let active = true;
    mosqueApi.list()
      .then((list) => {
        if (!active) return;
        setMosques(list.filter((m) => m.status === 'active').map((m) => ({ id: m.id, name: m.name })));
      })
      .catch(() => { if (active) setMosques([]); });
    funeralApi.listCemeteries()
      .then((list) => { if (active) setCemeteries(list); })
      .catch(() => { if (active) setCemeteries([]); });
    return () => { active = false; };
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    mode: 'onTouched',
    defaultValues: {
      deceased: { fullName: '', dateOfBirth: '', dateOfDeath: '', nationalId: '', placeOfDeath: '', causeOfDeath: '', deathCertificate: '' },
      family: { nextOfKin: '', phone: '', email: '', address: '', emergencyContact: '' },
      arrangements: {
        preferredMosque: '', preferredCemetery: '', preferredBurialDate: '', preferredBurialTime: '',
        transportationRequired: false, notes: '',
      },
    },
  });

  const values = watch();

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    const ok = fields.length === 0 || (await trigger(fields as never));
    if (ok) setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    try {
      // Normalize phone/ID to bare digits so the stored value is canonical.
      const payload: FormValues = {
        ...data,
        deceased: { ...data.deceased, nationalId: digitsOnly(data.deceased.nationalId) },
        family: {
          ...data.family,
          phone: normalizeRwPhone(data.family.phone),
          emergencyContact: data.family.emergencyContact ? normalizeRwPhone(data.family.emergencyContact) : data.family.emergencyContact,
        },
      };
      await funeralApi.submitRequest({
        ...payload,
        deceased: {
          ...payload.deceased,
          // The key is already in deathCertificate; ship the metadata the admin
          // UI needs to render the document.
          deathCertificateName: certificate?.fileName,
          deathCertificateMime: certificate?.mimeType,
          deathCertificateSize: certificate?.fileSize,
        },
      });
      setSubmitted(true);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError(t('validation.required'));
    }
  };

  const onPickFile = async (file?: File | null) => {
    setCertError('');
    if (!file) {
      setCertificate(null);
      setValue('deceased.deathCertificate', '');
      return;
    }
    if (file.size > FUNERAL_DOC_MAX_BYTES) {
      setCertError(t('deceased.certificateTooLarge'));
      return;
    }
    if (!FUNERAL_DOC_ACCEPT.split(',').includes(file.type)) {
      setCertError(t('deceased.certificateType'));
      return;
    }

    setCertUploading(true);
    setCertPct(0);
    try {
      const doc = await funeralApi.uploadDocument(file, setCertPct);
      setCertificate(doc);
      setValue('deceased.deathCertificate', doc.fileKey);
    } catch {
      setCertError(t('deceased.certificateUploadFailed'));
      setCertificate(null);
      setValue('deceased.deathCertificate', '');
    } finally {
      setCertUploading(false);
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
        <div className="mt-7 flex flex-col items-center gap-3">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => { reset(); setSubmitted(false); setCertificate(null); setStep(0); }}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              {t('success.again')}
            </button>
            <Link
              href={`/${locale}/services/funeral`}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              {t('success.home')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const last = step === STEP_KEYS.length - 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Stepper */}
      <ol className="mb-8 flex items-center">
        {STEP_KEYS.map((key, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={key} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 transition-colors ${
                    active ? 'bg-rmc-green text-white ring-rmc-green'
                      : done ? 'bg-rmc-green/10 text-rmc-green ring-rmc-green/20'
                        : 'bg-gray-100 text-gray-400 ring-gray-200'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className={`hidden truncate text-xs font-semibold sm:block ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {t(`steps.${key}`)}
                </span>
              </div>
              {i < STEP_KEYS.length - 1 && (
                <span className={`mx-2 h-px flex-1 ${done ? 'bg-rmc-green/40' : 'bg-gray-200'}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Step 0 — Deceased */}
        {step === 0 && (
          <Section heading={t('deceased.heading')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('deceased.fullName')} required hint={t('deceased.fullNameHint')} error={errors.deceased?.fullName?.message} className="sm:col-span-2">
                <input className={cx(inputClass, errors.deceased?.fullName && inputError)} {...register('deceased.fullName')} />
              </Field>

              <Field label={t('deceased.gender')} required error={errors.deceased?.gender?.message}>
                <div className="flex gap-2">
                  {(['male', 'female'] as const).map((g) => (
                    <label key={g} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/50 has-[:checked]:text-rmc-green-dark">
                      <input type="radio" value={g} className="accent-rmc-green" {...register('deceased.gender')} />
                      {t(`deceased.${g}`)}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label={t('deceased.nationalId')} required hint={t('deceased.nationalIdHint')} error={errors.deceased?.nationalId?.message}>
                <input inputMode="numeric" className={cx(inputClass, errors.deceased?.nationalId && inputError)} {...register('deceased.nationalId')} />
              </Field>

              <Field label={t('deceased.dob')} required hint={t('deceased.dobHint')} error={errors.deceased?.dateOfBirth?.message}>
                <input type="date" className={cx(inputClass, errors.deceased?.dateOfBirth && inputError)} {...register('deceased.dateOfBirth')} />
              </Field>
              <Field label={t('deceased.dod')} required hint={t('deceased.dodHint')} error={errors.deceased?.dateOfDeath?.message}>
                <input type="date" className={cx(inputClass, errors.deceased?.dateOfDeath && inputError)} {...register('deceased.dateOfDeath')} />
              </Field>

              <Field label={t('deceased.placeOfDeath')} required hint={t('deceased.placeOfDeathHint')} error={errors.deceased?.placeOfDeath?.message} className="sm:col-span-2">
                <input className={cx(inputClass, errors.deceased?.placeOfDeath && inputError)} {...register('deceased.placeOfDeath')} />
              </Field>

              <Field label={t('deceased.cause')} hint={t('deceased.causeHint')} className="sm:col-span-2">
                <input className={inputClass} {...register('deceased.causeOfDeath')} />
              </Field>

              <Field label={t('deceased.certificate')} hint={t('deceased.certificateHint')} className="sm:col-span-2">
                {certificate ? (
                  <div className="flex items-center gap-3 rounded-xl border border-rmc-green/30 bg-rmc-green-light/40 px-3.5 py-3 text-sm">
                    <FileCheck2 className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{certificate.fileName}</span>
                      <span className="block text-[11.5px] text-gray-500">
                        {Math.max(1, Math.round(certificate.fileSize / 1024))} KB · {t('deceased.certificateUploaded')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void onPickFile(null)}
                      aria-label={t('deceased.certificateRemove')}
                      className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-sm transition-colors',
                    certError
                      ? 'border-red-300 text-red-500'
                      : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-rmc-green/40 hover:text-rmc-green',
                    certUploading && 'cursor-wait',
                  )}>
                    {certUploading
                      ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                      : <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span className="truncate">
                      {certUploading ? `${t('deceased.certificateUploading')} ${certPct}%` : t('deceased.certificate')}
                    </span>
                    <input
                      type="file"
                      accept={FUNERAL_DOC_ACCEPT}
                      disabled={certUploading}
                      className="hidden"
                      onChange={(e) => { void onPickFile(e.target.files?.[0]); e.target.value = ''; }}
                    />
                  </label>
                )}
                {certError && (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
                    <X className="h-3 w-3 shrink-0" aria-hidden="true" /> {certError}
                  </p>
                )}
              </Field>
            </div>
          </Section>
        )}

        {/* Step 1 — Family */}
        {step === 1 && (
          <Section heading={t('family.heading')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('family.nextOfKin')} required hint={t('family.nextOfKinHint')} error={errors.family?.nextOfKin?.message}>
                <input className={cx(inputClass, errors.family?.nextOfKin && inputError)} {...register('family.nextOfKin')} />
              </Field>
              <Field label={t('family.phone')} required hint={t('family.phoneHint')} error={errors.family?.phone?.message}>
                <input type="tel" inputMode="tel" placeholder="07XXXXXXXX" className={cx(inputClass, errors.family?.phone && inputError)} {...register('family.phone')} />
              </Field>
              <Field label={t('family.email')} hint={t('family.emailHint')} error={errors.family?.email?.message}>
                <input type="email" className={cx(inputClass, errors.family?.email && inputError)} {...register('family.email')} />
              </Field>
              <Field label={t('family.emergency')} hint={t('family.emergencyHint')}>
                <input type="tel" inputMode="tel" placeholder="07XXXXXXXX" className={inputClass} {...register('family.emergencyContact')} />
              </Field>
              <Field label={t('family.address')} required hint={t('family.addressHint')} error={errors.family?.address?.message} className="sm:col-span-2">
                <input className={cx(inputClass, errors.family?.address && inputError)} {...register('family.address')} />
              </Field>
            </div>
          </Section>
        )}

        {/* Step 2 — Arrangements */}
        {step === 2 && (
          <Section heading={t('arrangements.heading')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('arrangements.mosque')} hint={t('arrangements.mosqueHint')}>
                <SearchableSelect
                  value={watch('arrangements.preferredMosque') ?? ''}
                  onChange={(v) => setValue('arrangements.preferredMosque', v)}
                  options={mosques.map((m) => ({ value: m.id, label: m.name }))}
                  noneLabel={t('arrangements.selectMosque')}
                  placeholder={t('arrangements.selectMosque')}
                  searchPlaceholder={t('arrangements.selectMosque')}
                  size="md"
                  zIndex={45}
                />
              </Field>
              <Field label={t('arrangements.cemetery')} hint={t('arrangements.cemeteryHint')}>
                <SearchableSelect
                  value={watch('arrangements.preferredCemetery') ?? ''}
                  onChange={(v) => setValue('arrangements.preferredCemetery', v)}
                  options={cemeteries.map((c) => ({ value: c.id, label: c.name }))}
                  noneLabel={t('arrangements.selectCemetery')}
                  placeholder={t('arrangements.selectCemetery')}
                  searchPlaceholder={t('arrangements.selectCemetery')}
                  size="md"
                  zIndex={45}
                />
              </Field>
              <Field label={t('arrangements.burialDate')} hint={t('arrangements.burialDateHint')}>
                <input type="date" className={inputClass} {...register('arrangements.preferredBurialDate')} />
              </Field>
              <Field label={t('arrangements.burialTime')} hint={t('arrangements.burialTimeHint')}>
                <input type="time" className={inputClass} {...register('arrangements.preferredBurialTime')} />
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                {t('arrangements.servicesLabel')}
              </legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/40">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-rmc-green" {...register('arrangements.transportationRequired')} />
                {t('arrangements.transport')}
              </label>
            </fieldset>

            <Field label={t('arrangements.notes')} hint={t('arrangements.notesHint')} className="mt-4">
              <textarea rows={3} className={inputClass} {...register('arrangements.notes')} />
            </Field>
          </Section>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <Section heading={t('review.heading')} sub={t('review.sub')}>
            <div className="space-y-4">
              <ReviewGroup title={t('steps.deceased')} rows={[
                [t('deceased.fullName'), values.deceased?.fullName],
                [t('deceased.gender'), values.deceased?.gender ? t(`deceased.${values.deceased.gender}`) : ''],
                [t('deceased.dob'), values.deceased?.dateOfBirth],
                [t('deceased.dod'), values.deceased?.dateOfDeath],
                [t('deceased.nationalId'), values.deceased?.nationalId],
                [t('deceased.placeOfDeath'), values.deceased?.placeOfDeath],
                [t('deceased.cause'), values.deceased?.causeOfDeath],
                [t('deceased.certificate'), certificate?.fileName ?? ''],
              ]} fallback={t('review.notProvided')} />

              <ReviewGroup title={t('steps.family')} rows={[
                [t('family.nextOfKin'), values.family?.nextOfKin],
                [t('family.phone'), values.family?.phone],
                [t('family.email'), values.family?.email],
                [t('family.address'), values.family?.address],
                [t('family.emergency'), values.family?.emergencyContact],
              ]} fallback={t('review.notProvided')} />

              <ReviewGroup title={t('steps.arrangements')} rows={[
                [t('arrangements.mosque'), mosques.find((m) => m.id === values.arrangements?.preferredMosque)?.name],
                [t('arrangements.cemetery'), cemeteries.find((c) => c.id === values.arrangements?.preferredCemetery)?.name],
                [t('arrangements.burialDate'), values.arrangements?.preferredBurialDate],
                [t('arrangements.burialTime'), values.arrangements?.preferredBurialTime],
                [t('arrangements.transport'), values.arrangements?.transportationRequired ? t('review.yes') : t('review.no')],
                [t('arrangements.notes'), values.arrangements?.notes],
              ]} fallback={t('review.notProvided')} />
            </div>

            {submitError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{submitError}</p>
            )}
          </Section>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step === 0 ? (
            <Link
              href={`/${locale}/services/funeral`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-rmc-green"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('back')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('prev')}
            </button>
          )}

          {last ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? t('submitting') : t('submit')}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-all duration-300 hover:bg-rmc-green-dark"
            >
              {t('next')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function Section({ heading, sub, children }: { heading: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">{heading}</h2>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label, hint, error, required, className, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
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

function ReviewGroup({ title, rows, fallback }: { title: string; rows: [string, string | undefined][]; fallback: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{title}</p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[12px] text-gray-400">{label}</dt>
            <dd className="min-w-0 truncate text-right text-[13px] font-medium text-gray-800">{value || fallback}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

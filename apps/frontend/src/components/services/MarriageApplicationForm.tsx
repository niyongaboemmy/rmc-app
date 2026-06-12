'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  User, Fingerprint, Users, UserCheck, ImageUp, CheckCircle2, ArrowRight, X,
  Building2, MapPin, Smartphone, Landmark, Banknote, Wallet, Copy, Check, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import { generateApplicationId, saveApplication } from '@/lib/marriageApplications';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

// Rwanda administrative divisions — province key → districts
const PROVINCE_KEYS = ['kigali', 'north', 'south', 'east', 'west'] as const;
const DISTRICTS: Record<(typeof PROVINCE_KEYS)[number], string[]> = {
  kigali: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  north: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  south: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
  east: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  west: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
};

// 16-digit Rwandan National ID
const nid = z.string().regex(/^\d{16}$/, 'Must be exactly 16 digits');
const fullName = z.string().trim().min(3, 'Please enter the full name');

const schema = z.object({
  groomName: fullName,
  groomNid: nid,
  brideName: fullName,
  brideNid: nid,
  witness1Nid: nid,
  witness2Nid: nid,
  officiant: z.string().trim().min(3, 'Please enter the officiant name'),
  province: z.enum(PROVINCE_KEYS, {
    errorMap: () => ({ message: 'Please select a province' }),
  }),
  district: z.string().min(1, 'Please select a district'),
  venue: z.enum(['mosque', 'outside'], {
    errorMap: () => ({ message: 'Please select where the ceremony will be held' }),
  }),
  payment: z.enum(['momo', 'bank', 'cash'], {
    errorMap: () => ({ message: 'Please select a payment method' }),
  }),
});
type FormData = z.infer<typeof schema>;

/* ── Selectable radio card ── */
function OptionCard({
  value,
  checked,
  registration,
  icon,
  title,
  subtitle,
}: {
  value: string;
  checked: boolean;
  registration: UseFormRegisterReturn;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      className={cn(
        'relative flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200',
        checked
          ? 'border-rose-500 bg-rose-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-rose-300',
      )}
    >
      <input type="radio" value={value} className="sr-only" {...registration} />
      <span
        className={cn(
          'w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors',
          checked ? 'bg-gradient-to-br from-rose-600 to-rose-800 text-white' : 'bg-gray-100 text-gray-500',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500 truncate">{subtitle}</span>
      </span>
      {checked && <CheckCircle2 className="w-5 h-5 text-rose-600 ms-auto shrink-0" />}
    </label>
  );
}

export function MarriageApplicationForm() {
  const t = useTranslations('services.marriage.apply');
  const { locale } = useParams<{ locale: string }>();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const success = appId !== null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const province = watch('province');
  const venue = watch('venue');
  const payment = watch('payment');

  const provinceReg = register('province');
  const provinceOptions = PROVINCE_KEYS.map((key) => ({ value: key, label: t(`provinces.${key}`) }));
  const districtOptions = province ? DISTRICTS[province].map((d) => ({ value: d, label: d })) : [];
  const feeLabel = venue === 'mosque' ? t('feeMosque') : venue === 'outside' ? t('feeOutside') : null;

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Photo must be a JPG or PNG image');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo must be 5 MB or smaller');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
  };

  const onSubmit = async (data: FormData) => {
    if (!photo) {
      setPhotoError('Please upload an ID photo for the certificate');
      return;
    }
    setIsLoading(true);
    try {
      // TODO: wire to backend once the marriage-application endpoint exists.
      const body = new FormData();
      Object.entries(data).forEach(([k, v]) => body.append(k, v));
      body.append('idPhoto', photo);
      // await apiClient.post('/services/marriage/applications', body);
      await new Promise((r) => setTimeout(r, 800));

      const id = generateApplicationId();
      saveApplication({
        id,
        ...data,
        status: 'review',
        submittedAt: new Date().toISOString(),
      });
      setAppId(id);
    } finally {
      setIsLoading(false);
    }
  };

  const copyId = async () => {
    if (!appId) return;
    try {
      await navigator.clipboard.writeText(appId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  /* ── Success state ── */
  if (success) {
    return (
      <div className="animate-scale-in text-center py-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('successTitle')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto mb-6">{t('successText')}</p>

        {/* Application ID */}
        <div className="max-w-sm mx-auto mb-6 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-5">
          <p className="text-xs font-medium text-gray-500 mb-2">{t('applicationIdLabel')}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold tracking-wider text-rose-700">{appId}</span>
            <button
              type="button"
              onClick={copyId}
              className="w-9 h-9 rounded-lg bg-white border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
              aria-label={t('copyId')}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">{t('idSavePrompt')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/services/marriage/status?id=${appId}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 text-white font-semibold text-sm hover:shadow-lg hover:shadow-rose-900/30 transition-all duration-200"
          >
            <Search className="w-4 h-4" /> {t('checkStatusBtn')}
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              clearPhoto();
              setCopied(false);
              setAppId(null);
            }}
          >
            {t('successAnother')}
          </Button>
        </div>
      </div>
    );
  }

  const nidProps = {
    inputMode: 'numeric' as const,
    maxLength: 16,
    placeholder: t('nidPlaceholder'),
    leftIcon: <Fingerprint className="w-4 h-4" />,
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Couple details */}
      <FormSection title={t('coupleSection')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t('groomName')}
            required
            leftIcon={<User className="w-4 h-4" />}
            placeholder={t('namePlaceholder')}
            error={errors.groomName?.message}
            {...register('groomName')}
          />
          <Input
            label={t('groomNid')}
            required
            error={errors.groomNid?.message}
            {...nidProps}
            {...register('groomNid')}
          />
          <Input
            label={t('brideName')}
            required
            leftIcon={<User className="w-4 h-4" />}
            placeholder={t('namePlaceholder')}
            error={errors.brideName?.message}
            {...register('brideName')}
          />
          <Input
            label={t('brideNid')}
            required
            error={errors.brideNid?.message}
            {...nidProps}
            {...register('brideNid')}
          />
        </div>
      </FormSection>

      {/* Witnesses */}
      <FormSection title={t('witnessSection')} description={t('witnessNote')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label={t('witness1')}
            required
            error={errors.witness1Nid?.message}
            {...nidProps}
            leftIcon={<Users className="w-4 h-4" />}
            {...register('witness1Nid')}
          />
          <Input
            label={t('witness2')}
            required
            error={errors.witness2Nid?.message}
            {...nidProps}
            leftIcon={<Users className="w-4 h-4" />}
            {...register('witness2Nid')}
          />
        </div>
      </FormSection>

      {/* Officiant */}
      <FormSection title={t('officiantSection')}>
        <Input
          label={t('officiant')}
          required
          leftIcon={<UserCheck className="w-4 h-4" />}
          hint={t('officiantHint')}
          placeholder={t('namePlaceholder')}
          error={errors.officiant?.message}
          {...register('officiant')}
        />
      </FormSection>

      {/* Ceremony location → drives the fee */}
      <FormSection title={t('venueSection')} description={t('venueNote')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label={t('province')}
            required
            placeholder={t('provincePlaceholder')}
            options={provinceOptions}
            error={errors.province?.message}
            {...provinceReg}
            onChange={(e) => {
              provinceReg.onChange(e);
              setValue('district', '', { shouldValidate: false });
            }}
          />
          <Select
            label={t('district')}
            required
            placeholder={t('districtPlaceholder')}
            options={districtOptions}
            disabled={!province}
            error={errors.district?.message}
            {...register('district')}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <OptionCard
            value="mosque"
            checked={venue === 'mosque'}
            registration={register('venue')}
            icon={<Building2 className="w-5 h-5" />}
            title={t('venueMosqueTitle')}
            subtitle={t('feeMosque')}
          />
          <OptionCard
            value="outside"
            checked={venue === 'outside'}
            registration={register('venue')}
            icon={<MapPin className="w-5 h-5" />}
            title={t('venueOutsideTitle')}
            subtitle={t('feeOutside')}
          />
        </div>
        {errors.venue && <p className="mt-2 text-xs text-red-600">{errors.venue.message}</p>}

        {/* Amount due */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          <span className="text-sm font-medium text-gray-600">{t('amountDue')}</span>
          <span className={cn('text-lg font-bold', feeLabel ? 'text-rose-700' : 'text-gray-400')}>
            {feeLabel ?? t('amountSelectVenue')}
          </span>
        </div>
      </FormSection>

      {/* Payment method */}
      <FormSection title={t('paymentSection')} description={t('paymentNote')}>
        <div className="grid sm:grid-cols-3 gap-4">
          <OptionCard
            value="momo"
            checked={payment === 'momo'}
            registration={register('payment')}
            icon={<Smartphone className="w-5 h-5" />}
            title={t('payMomo')}
            subtitle={t('payMomoSub')}
          />
          <OptionCard
            value="bank"
            checked={payment === 'bank'}
            registration={register('payment')}
            icon={<Landmark className="w-5 h-5" />}
            title={t('payBank')}
            subtitle={t('payBankSub')}
          />
          <OptionCard
            value="cash"
            checked={payment === 'cash'}
            registration={register('payment')}
            icon={<Banknote className="w-5 h-5" />}
            title={t('payCash')}
            subtitle={t('payCashSub')}
          />
        </div>
        {errors.payment && <p className="mt-2 text-xs text-red-600">{errors.payment.message}</p>}
      </FormSection>

      {/* Certificate photo */}
      <FormSection title={t('photoSection')}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 select-none">
          {t('photo')}<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-28 shrink-0 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/40 overflow-hidden flex items-center justify-center relative">
            {photoPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="ID preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <ImageUp className="w-7 h-7 text-rose-300" />
            )}
          </div>
          <div className="flex-1">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:border-rose-300 hover:text-rose-700 transition-colors">
              <ImageUp className="w-4 h-4" />
              {photo ? t('photoChange') : t('photoChoose')}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={onPhotoChange}
              />
            </label>
            <p className={`mt-2 text-xs ${photoError ? 'text-red-600' : 'text-gray-500'}`}>
              {photoError ?? t('photoHint')}
            </p>
          </div>
        </div>
      </FormSection>

      {/* Payment reminder */}
      <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
        <Wallet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-amber-900/80 text-xs leading-relaxed">{t('paymentNote')}</p>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={isLoading}
        rightIcon={<ArrowRight className="w-4 h-4" />}
        className="!bg-gradient-to-br !from-rose-600 !to-rose-800 !text-white hover:!shadow-lg hover:!shadow-rose-900/30 focus:!ring-rose-500"
      >
        {t('submit')}
      </Button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  User, Fingerprint, Users, UserCheck, ImageUp, CheckCircle2, ArrowRight, X,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormField';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

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
});
type FormData = z.infer<typeof schema>;

export function MarriageApplicationForm() {
  const t = useTranslations('services.marriage.apply');

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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
      // const body = new FormData();
      // Object.entries(data).forEach(([k, v]) => body.append(k, v));
      // body.append('idPhoto', photo);
      // await apiClient.post('/services/marriage/applications', body);
      await new Promise((r) => setTimeout(r, 800));
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Success state ── */
  if (success) {
    return (
      <div className="animate-scale-in text-center py-10">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('successTitle')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto mb-8">{t('successText')}</p>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            clearPhoto();
            setSuccess(false);
          }}
        >
          {t('successAnother')}
        </Button>
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

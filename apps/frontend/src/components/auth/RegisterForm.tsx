'use client';

import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PhoneInput, toE164 } from '@/components/ui/PhoneInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiClient } from '@/lib/api';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 characters'),
  lastName:  z.string().min(2, 'Minimum 2 characters'),
  email:     z.string().email('Invalid email address'),
  phone:     z.string().regex(/^7[2389]\d{7}$/, 'Enter a valid Rwanda number: 7XXXXXXXX'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])/,
      'Must include uppercase, lowercase, number & special character',
    ),
  gender: z.enum(['male', 'female']).optional(),
});
type RegisterFormData = z.infer<typeof registerSchema>;

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-12 h-12 text-rmc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function RegisterForm() {
  const t   = useTranslations('auth.register');
  const nav = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const router     = useRouter();
  const [apiError, setApiError]     = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [isLoading, setIsLoading]   = useState(false);

  const { register, handleSubmit, control, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', { ...data, phone: toE164(data.phone) });
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Success state ── */
  if (success) {
    return (
      <div className="animate-scale-in">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-8 py-12 text-center space-y-4">
          <div className="flex justify-center animate-bounce-soft">
            <CheckIcon />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('success')}</h2>
          <p className="text-gray-400 text-sm">Redirecting you to sign in…</p>
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mt-4">
            <div
              className="h-full bg-rmc-green rounded-full"
              style={{ animation: 'shimmer 2.5s linear forwards', backgroundSize: '400% 100%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        className="text-center mb-7 animate-fade-up"
        style={{ animationDelay: '0ms' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-rmc-green overflow-hidden mx-auto mb-4 shadow-lg shadow-rmc-green/35 ring-4 ring-rmc-green/10 hover:ring-rmc-green/25 hover:shadow-xl hover:shadow-rmc-green/30 transition-all duration-300">
          <Image
            src="/logo.webp"
            alt="RMC"
            width={64}
            height={64}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1.5">{t('subtitle')}</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-6 py-7 sm:px-8 sm:py-8 hover:shadow-2xl hover:shadow-gray-100 transition-shadow duration-500">
        {apiError && (
          <div className="animate-slide-down mb-5">
            <Alert variant="error" message={apiError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <Input
              label={t('firstName')}
              autoComplete="given-name"
              leftIcon={<UserIcon />}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label={t('lastName')}
              autoComplete="family-name"
              leftIcon={<UserIcon />}
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
            <Input
              label={t('email')}
              type="email"
              placeholder="ahmed@example.com"
              autoComplete="email"
              leftIcon={<MailIcon />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <PhoneInput
              label={t('phone')}
              hint={t('phoneHelp')}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          {/* Controlled password with strength meter */}
          <div className="animate-fade-up" style={{ animationDelay: '320ms' }}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordInput
                  {...field}
                  label={t('password')}
                  autoComplete="new-password"
                  leftIcon={<LockIcon />}
                  showStrength
                  hint={t('passwordHelp')}
                  error={errors.password?.message}
                />
              )}
            />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
            <Select
              label={t('gender')}
              placeholder="— Select gender —"
              {...register('gender')}
            >
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </Select>
          </div>

          <div className="animate-fade-up pt-1" style={{ animationDelay: '480ms' }}>
            <Button type="submit" isLoading={isLoading} size="lg" className="w-full group">
              <span className="flex items-center gap-2">
                {t('submit')}
                <svg
                  className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-200"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Button>
          </div>
        </form>

        {/* Divider + sign-in link */}
        <div className="relative my-6 animate-fade-up" style={{ animationDelay: '520ms' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">Already a member?</span>
          </div>
        </div>

        <p
          className="text-center text-sm text-gray-500 animate-fade-up"
          style={{ animationDelay: '560ms' }}
        >
          {t('alreadyAccount')}{' '}
          <Link
            href={`/${locale}/login`}
            className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors duration-150"
          >
            {nav('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}

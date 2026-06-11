'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password:   z.string().min(1, 'Required'),
  mfaCode:    z.string().length(6).optional().or(z.literal('')),
});
type LoginFormData = z.infer<typeof loginSchema>;

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

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export function LoginForm() {
  const t   = useTranslations('auth.login');
  const nav = useTranslations('nav');
  const { locale }           = useParams<{ locale: string }>();
  const router               = useRouter();
  const { login, isLoading } = useAuth();
  const [apiError, setApiError]       = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const result = await login(data.identifier, data.password, data.mfaCode || undefined);
      if (result.requiresMfa) { setRequiresMfa(true); return; }
      router.push(`/${locale}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Login failed');
    }
  };

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
          {/* Identifier */}
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <Input
              label={t('identifier')}
              placeholder="email@example.com or +250…"
              autoComplete="username"
              leftIcon={<MailIcon />}
              error={errors.identifier?.message}
              {...register('identifier')}
            />
          </div>

          {/* Password */}
          <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('password')}</label>
              <Link
                href={`/${locale}/forgot-password`}
                className="text-xs text-rmc-green hover:text-rmc-green-dark font-medium transition-colors duration-150 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <PasswordInput
              autoComplete="current-password"
              leftIcon={<LockIcon />}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          {/* MFA (conditional) */}
          {requiresMfa && (
            <div className="animate-slide-down">
              <Input
                label={t('mfaCode')}
                placeholder={t('mfaPlaceholder')}
                maxLength={6}
                leftIcon={<ShieldIcon />}
                error={errors.mfaCode?.message}
                {...register('mfaCode')}
              />
            </div>
          )}

          {/* Remember me */}
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <Checkbox label="Remember me" />
          </div>

          {/* Submit */}
          <div className="animate-fade-up pt-1" style={{ animationDelay: '320ms' }}>
            <Button
              type="submit"
              isLoading={isLoading}
              size="lg"
              className="w-full group"
            >
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

        {/* Divider */}
        <div className="relative my-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">New to RMC?</span>
          </div>
        </div>

        <p
          className="text-center text-sm text-gray-500 animate-fade-up"
          style={{ animationDelay: '440ms' }}
        >
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/register`}
            className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors duration-150"
          >
            {nav('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}

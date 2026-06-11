'use client';

import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { apiClient } from '@/lib/api';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])/,
      'Must include uppercase, lowercase, number & special char',
    ),
});
type FormData = { newPassword: string };

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-rmc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function ResetPasswordPage() {
  const t            = useTranslations('auth.resetPassword');
  const { locale }   = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const [apiError, setApiError]   = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        {/* Header */}
        <div className="text-center mb-7 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="w-16 h-16 rounded-2xl bg-rmc-green overflow-hidden mx-auto mb-4 shadow-lg shadow-rmc-green/35 ring-4 ring-rmc-green/10 hover:ring-rmc-green/25 transition-all duration-300">
            <Image src="/logo.webp" alt="RMC" width={64} height={64} className="w-full h-full object-cover" priority />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1.5">{t('subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-6 py-7 sm:px-8 sm:py-8 hover:shadow-2xl hover:shadow-gray-100 transition-shadow duration-500">
          {success ? (
            <div className="animate-scale-in text-center space-y-5 py-4">
              <div className="flex justify-center animate-bounce-soft">
                <CheckCircleIcon />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-gray-900">Password updated!</h2>
                <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
              </div>
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center gap-2 text-sm text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors"
              >
                <ArrowLeftIcon />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {!token && (
                <div className="animate-slide-down mb-5">
                  <Alert variant="error" message="Invalid or expired reset link. Please request a new one." />
                </div>
              )}
              {apiError && (
                <div className="animate-slide-down mb-5">
                  <Alert variant="error" message={apiError} />
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
                  <Controller
                    name="newPassword"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        {...field}
                        label={t('password')}
                        autoComplete="new-password"
                        leftIcon={<LockIcon />}
                        showStrength
                        hint="Min 8 chars with uppercase, lowercase, number & symbol"
                        error={errors.newPassword?.message}
                        disabled={!token}
                      />
                    )}
                  />
                </div>

                <div className="animate-fade-up pt-1" style={{ animationDelay: '160ms' }}>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={!token}
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

              <div className="relative my-6 animate-fade-up" style={{ animationDelay: '220ms' }}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 animate-fade-up" style={{ animationDelay: '260ms' }}>
                <Link
                  href={`/${locale}/login`}
                  className="inline-flex items-center gap-2 text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors"
                >
                  <ArrowLeftIcon />
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

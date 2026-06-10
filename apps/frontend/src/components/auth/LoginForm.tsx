'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
  mfaCode: z.string().length(6).optional().or(z.literal('')),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations('auth.login');
  const nav = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const result = await login(data.identifier, data.password, data.mfaCode || undefined);
      if (result.requiresMfa) {
        setRequiresMfa(true);
        return;
      }
      router.push(`/${locale}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(axiosErr?.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-rmc-green flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">RMC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>

        {apiError && <Alert variant="error" message={apiError} className="mb-4" />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('identifier')}
            placeholder="email@example.com or +250..."
            error={errors.identifier?.message}
            {...register('identifier')}
          />

          <Input
            label={t('password')}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {requiresMfa && (
            <Input
              label={t('mfaCode')}
              placeholder={t('mfaPlaceholder')}
              maxLength={6}
              error={errors.mfaCode?.message}
              {...register('mfaCode')}
            />
          )}

          <div className="flex items-center justify-end">
            <Link href={`/${locale}/forgot-password`} className="text-sm text-rmc-green hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full">
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="text-rmc-green font-medium hover:underline">
            {nav('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}

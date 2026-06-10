'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiClient } from '@/lib/api';

const schema = z.object({
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])/, 'Must include uppercase, lowercase, number & special char'),
});

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<{ newPassword: string }>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { newPassword: string }) => {
    if (!token) return;
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) return <div className="min-h-screen flex items-center justify-center"><Alert variant="success" message={t('success')} /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rmc-green-light to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">{t('title')}</h1>
        <p className="text-gray-500 text-sm text-center mb-6">{t('subtitle')}</p>
        {apiError && <Alert variant="error" message={apiError} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('password')} type="password" error={errors.newPassword?.message} {...register('newPassword')} />
          <Button type="submit" isLoading={isLoading} className="w-full">{t('submit')}</Button>
        </form>
        <p className="text-center text-sm mt-4">
          <Link href={`/${locale}/login`} className="text-rmc-green hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

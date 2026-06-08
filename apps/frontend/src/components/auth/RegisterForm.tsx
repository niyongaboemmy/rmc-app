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
import { apiClient } from '@/lib/api';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 characters'),
  lastName: z.string().min(2, 'Minimum 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+250[0-9]{9}$/, 'Format: +250XXXXXXXXX'),
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

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const nav = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', data);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(axiosErr?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Alert variant="success" message={t('success')} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-rmc-green flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">RMC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>

        {apiError && <Alert variant="error" message={apiError} className="mb-4" />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('firstName')}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label={t('lastName')}
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label={t('email')}
            type="email"
            placeholder="ahmed@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={t('phone')}
            type="tel"
            placeholder="+250781234567"
            hint={t('phoneHelp')}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label={t('password')}
            type="password"
            hint={t('passwordHelp')}
            error={errors.password?.message}
            {...register('password')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('gender')}</label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              {...register('gender')}
            >
              <option value="">—</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </select>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full mt-2">
            {t('submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('alreadyAccount')}{' '}
          <Link href={`/${locale}/login`} className="text-rmc-green font-medium hover:underline">
            {nav('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}

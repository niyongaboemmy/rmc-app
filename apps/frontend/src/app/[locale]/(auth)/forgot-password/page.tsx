'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { apiClient } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormData = z.infer<typeof schema>;

const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const MailSentIcon = () => (
  <svg className="w-12 h-12 text-rmc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function ForgotPasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const [sent, setSent]           = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Request failed. Please try again.');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1.5">Enter your email to receive a reset link</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-6 py-7 sm:px-8 sm:py-8 hover:shadow-2xl hover:shadow-gray-100 transition-shadow duration-500">
          {sent ? (
            <div className="animate-scale-in text-center space-y-5 py-4">
              <div className="flex justify-center animate-bounce-soft">
                <MailSentIcon />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-gray-900">Check your inbox</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  If that email is registered, a password reset link has been sent. Check your spam folder too.
                </p>
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
              {apiError && (
                <div className="animate-slide-down mb-5">
                  <Alert variant="error" message={apiError} />
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    leftIcon={<MailIcon />}
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>

                <div className="animate-fade-up pt-1" style={{ animationDelay: '160ms' }}>
                  <Button type="submit" isLoading={isLoading} size="lg" className="w-full group">
                    <span className="flex items-center gap-2">
                      Send Reset Link
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
                Remember your password?{' '}
                <Link
                  href={`/${locale}/login`}
                  className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

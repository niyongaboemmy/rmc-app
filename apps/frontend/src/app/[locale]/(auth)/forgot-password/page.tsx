'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiClient } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-rmc-green-light to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-rmc-green flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">RMC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <Alert variant="success" message="If that email is registered, a reset link has been sent. Check your inbox." />
            <Link href={`/${locale}/login`} className="block text-center text-rmc-green hover:underline text-sm mt-4">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {apiError && <Alert variant="error" message={apiError} className="mb-4" />}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" isLoading={isLoading} className="w-full">
                Send Reset Link
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              Remember your password?{' '}
              <Link href={`/${locale}/login`} className="text-rmc-green hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { OtpInput } from '@/components/ui/OtpInput';
import { useAuth } from '@/hooks/useAuth';

// ── Schemas ────────────────────────────────────────────────────────────────────

const credentialsSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password:   z.string().min(1, 'Required'),
  mfaCode:    z.string().length(6).optional().or(z.literal('')),
});
type CredentialsData = z.infer<typeof credentialsSchema>;

// ── Icons ─────────────────────────────────────────────────────────────────────

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

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((s?: number) => {
    setRemaining(s ?? seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  useEffect(() => {
    reset();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { remaining, reset };
}

// ── Two-factor step ────────────────────────────────────────────────────────────

interface TwoFactorStepProps {
  maskedPhone: string;
  tempToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

function TwoFactorStep({ maskedPhone, tempToken, onSuccess, onBack }: TwoFactorStepProps) {
  const { verify2fa, resend2fa } = useAuth();
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const { remaining, reset }    = useCountdown(60);

  const handleVerify = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError(null);
    setLoading(true);
    try {
      await verify2fa(tempToken, otp);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Invalid code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await resend2fa(tempToken);
      reset(60);
      setOtp('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="animate-slide-down space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-rmc-green/10 flex items-center justify-center text-rmc-green">
          <PhoneIcon />
        </div>
        <h2 className="text-lg font-bold text-gray-900">2-Step Verification</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter the 6-digit code sent to <span className="font-semibold text-gray-700">{maskedPhone}</span>
        </p>
      </div>

      {/* Error */}
      {error && <Alert variant="error" message={error} />}

      {/* OTP boxes */}
      <OtpInput
        value={otp}
        onChange={setOtp}
        disabled={loading}
        error={undefined}
        autoFocus
      />

      {/* Verify button */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        isLoading={loading}
        onClick={handleVerify}
        disabled={otp.length < 6}
      >
        Verify Code
      </Button>

      {/* Resend + Back */}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-gray-700 transition-colors duration-150 font-medium"
        >
          ← Back
        </button>

        {remaining > 0 ? (
          <span className="text-gray-400">
            Resend in <span className="font-semibold text-gray-600 tabular-nums">{remaining}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-rmc-green hover:text-rmc-green-dark font-semibold transition-colors duration-150 disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main LoginForm ─────────────────────────────────────────────────────────────

type Step = 'credentials' | 'mfa' | '2fa';

export function LoginForm() {
  const t   = useTranslations('auth.login');
  const nav = useTranslations('nav');
  const { locale }                   = useParams<{ locale: string }>();
  const router                       = useRouter();
  const { login }                    = useAuth();
  const [step, setStep]              = useState<Step>('credentials');
  const [submitting, setSubmitting]  = useState(false);
  const [apiError, setApiError]      = useState<string | null>(null);
  const [twoFactorState, set2faState] = useState<{ tempToken: string; maskedPhone: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CredentialsData>({
    resolver: zodResolver(credentialsSchema),
  });

  const onSubmit = async (data: CredentialsData) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const result = await login(data.identifier, data.password, data.mfaCode || undefined);

      if (result.requiresMfa) { setStep('mfa'); return; }

      if (result.requires2fa && result.tempToken && result.maskedPhone) {
        set2faState({ tempToken: result.tempToken, maskedPhone: result.maskedPhone });
        setStep('2fa');
        return;
      }

      router.push(`/${locale}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    set2faState(null);
    setApiError(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-7 animate-fade-up" style={{ animationDelay: '0ms' }}>
        <div className="w-16 h-16 rounded-2xl bg-rmc-green overflow-hidden mx-auto mb-4 shadow-lg shadow-rmc-green/35 ring-4 ring-rmc-green/10 hover:ring-rmc-green/25 hover:shadow-xl hover:shadow-rmc-green/30 transition-all duration-300">
          <Image src="/logo.webp" alt="RMC" width={64} height={64} className="w-full h-full object-cover" priority />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1.5">{t('subtitle')}</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-6 py-7 sm:px-8 sm:py-8 hover:shadow-2xl hover:shadow-gray-100 transition-shadow duration-500">

        {/* ── 2FA step ── */}
        {step === '2fa' && twoFactorState && (
          <TwoFactorStep
            maskedPhone={twoFactorState.maskedPhone}
            tempToken={twoFactorState.tempToken}
            onSuccess={() => router.push(`/${locale}`)}
            onBack={handleBack}
          />
        )}

        {/* ── Credentials / MFA step ── */}
        {step !== '2fa' && (
          <>
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

              {/* TOTP (Authenticator app) */}
              {step === 'mfa' && (
                <div className="animate-slide-down space-y-3">
                  <div className="flex items-center gap-2 text-sm text-rmc-green font-medium">
                    <ShieldIcon />
                    Authenticator app required
                  </div>
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
              {step === 'credentials' && (
                <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
                  <Checkbox label="Remember me" />
                </div>
              )}

              {/* Submit */}
              <div className="animate-fade-up pt-1" style={{ animationDelay: '320ms' }}>
                <Button type="submit" isLoading={submitting} size="lg" className="w-full group">
                  <span className="flex items-center gap-2">
                    {step === 'mfa' ? 'Verify' : t('submit')}
                    <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </div>

              {step === 'mfa' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-700 transition-colors duration-150 font-medium"
                >
                  ← Back to login
                </button>
              )}
            </form>

            {step === 'credentials' && (
              <>
                <div className="relative my-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-400">New to RMC?</span>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500 animate-fade-up" style={{ animationDelay: '440ms' }}>
                  {t('noAccount')}{' '}
                  <Link href={`/${locale}/register`} className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors duration-150">
                    {nav('register')}
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

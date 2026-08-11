'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PhoneInput, toE164, toLocalPhone } from '@/components/ui/PhoneInput';
import { apiClient } from '@/lib/api';

/**
 * Where RegisterForm leaves the number it just signed up, for this screen to pick
 * up. sessionStorage rather than a `?phone=` query param: the number would
 * otherwise sit in browser history, in the Referer header of every subsequent
 * request, and in any screenshot of the address bar.
 */
export const VERIFY_PHONE_KEY = 'rmc.verify-phone';

/** Backend allows 3 sends per 10 minutes; this keeps a user from burning them in seconds. */
const RESEND_COOLDOWN_SECONDS = 60;

const PhoneIcon = () => (
  <svg className="w-12 h-12 text-rmc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-12 h-12 text-rmc-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type ApiError = { response?: { data?: { error?: { code?: string; message?: string } } } };

export function VerifyPhoneForm() {
  const t = useTranslations('auth.verifyPhone');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  // 'phone' when we don't know the number (direct visit, new tab); registration
  // hands us one and a code is already on its way, so we open straight on 'code'.
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(VERIFY_PHONE_KEY);
    if (stored) {
      setPhone(stored);
      setLocalPhone(toLocalPhone(stored));
      setStep('code');
      // register() already sent one; start the clock so resend isn't instant.
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  /** Server codes carry the detail worth translating; anything else falls back to its message. */
  const describe = useCallback(
    (err: unknown, fallback: string) => {
      const e = err as ApiError;
      const known: Record<string, string> = {
        AUTH_OTP_NOT_FOUND: t('errors.notFound'),
        AUTH_OTP_EXPIRED: t('errors.expired'),
        AUTH_OTP_INVALID: t('errors.invalid'),
        AUTH_OTP_MAX_ATTEMPTS: t('errors.maxAttempts'),
        AUTH_OTP_RATE_LIMITED: t('errors.rateLimited'),
        AUTH_PHONE_ALREADY_VERIFIED: t('errors.alreadyVerified'),
        NOT_FOUND: t('errors.unknownPhone'),
      };
      const code = e?.response?.data?.error?.code;
      return (code && known[code]) || e?.response?.data?.error?.message || fallback;
    },
    [t],
  );

  const sendCode = async (target: string) => {
    await apiClient.post('/auth/send-otp', { phone: target });
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const onSendToNewPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = toE164(localPhone);
    if (!/^\+250[0-9]{9}$/.test(e164)) {
      setError(t('errors.badPhone'));
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await sendCode(e164);
      setPhone(e164);
      sessionStorage.setItem(VERIFY_PHONE_KEY, e164);
      setStep('code');
      setNotice(t('codeSent'));
    } catch (err) {
      setError(describe(err, t('errors.sendFailed')));
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await sendCode(phone);
      setNotice(t('codeResent'));
    } catch (err) {
      setError(describe(err, t('errors.sendFailed')));
    } finally {
      setIsResending(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(t('errors.badCode'));
      return;
    }

    setError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/verify-phone', { phone, otp: code });
      sessionStorage.removeItem(VERIFY_PHONE_KEY);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err) {
      setError(describe(err, t('errors.verifyFailed')));
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="animate-scale-in">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-8 py-12 text-center space-y-4">
          <div className="flex justify-center animate-bounce-soft">
            <CheckIcon />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('success')}</h2>
          <p className="text-gray-400 text-sm">{t('redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-7 animate-fade-up" style={{ animationDelay: '0ms' }}>
        <div className="w-16 h-16 rounded-2xl bg-rmc-green overflow-hidden mx-auto mb-4 shadow-lg shadow-rmc-green/35 ring-4 ring-rmc-green/10 transition-all duration-300">
          <Image src="/logo.webp" alt="RMC" width={64} height={64} className="w-full h-full object-cover" priority />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1.5">
          {step === 'code' ? t('subtitleSent', { phone }) : t('subtitle')}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 px-6 py-7 sm:px-8 sm:py-8">
        {error && (
          <div className="animate-slide-down mb-5">
            <Alert variant="error" message={error} />
          </div>
        )}
        {notice && !error && (
          <div className="animate-slide-down mb-5">
            <Alert variant="success" message={notice} />
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={onSendToNewPhone} className="space-y-4" noValidate>
            <div className="flex justify-center mb-2">
              <PhoneIcon />
            </div>
            <PhoneInput
              label={t('phone')}
              hint={t('phoneHelp')}
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
            />
            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
              {t('sendCode')}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-5" noValidate>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2 text-center">
                {t('code')}
              </label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-3xl font-bold tracking-[0.4em] py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-200 focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/20 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">{t('codeHelp')}</p>
            </div>

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
              {t('submit')}
            </Button>

            <div className="text-center text-sm">
              {cooldown > 0 ? (
                <span className="text-gray-400">{t('resendIn', { seconds: cooldown })}</span>
              ) : (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isResending}
                  className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors disabled:opacity-50"
                >
                  {isResending ? t('resending') : t('resend')}
                </button>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError(null);
                  setNotice(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors"
              >
                {t('changeNumber')}
              </button>
            </div>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
        </div>

        {/* Verification is not required to sign in, so saying so beats a dead end
            for anyone whose SMS never arrives. */}
        <p className="text-center text-sm text-gray-500">
          {t('later')}{' '}
          <Link
            href={`/${locale}/login`}
            className="text-rmc-green font-semibold hover:text-rmc-green-dark hover:underline transition-colors"
          >
            {t('skip')}
          </Link>
        </p>
      </div>
    </div>
  );
}

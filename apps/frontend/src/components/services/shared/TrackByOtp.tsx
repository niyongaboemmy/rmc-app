'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Loader2, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

const PHONE_RE = /^(?:\+?250|0)7\d{8}$/;
const RESEND_SECONDS = 60;

const ACCENTS = {
  green: { btn: 'bg-rmc-green hover:bg-rmc-green-dark focus:ring-rmc-green', ring: 'focus:ring-rmc-green/30 focus:border-rmc-green', text: 'text-rmc-green', soft: 'bg-rmc-green-light/60 border-rmc-green/20 text-rmc-green-dark' },
  emerald: { btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500', ring: 'focus:ring-emerald-500/30', text: 'text-emerald-600', soft: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
  rose: { btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500', ring: 'focus:ring-rose-500/30', text: 'text-rose-600', soft: 'bg-rose-50 border-rose-100 text-rose-800' },
} as const;

function apiError(err: unknown): { code?: string; message?: string } {
  const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
  return e?.response?.data?.error ?? {};
}

interface Props<T> {
  /** e.g. '/hajj/applications/track', '/marriage/applications/track'. */
  basePath: string;
  accent?: keyof typeof ACCENTS;
  /** Rendered once the phone OTP is verified. */
  children: (result: T, reset: () => void) => React.ReactNode;
}

/**
 * Reusable, secure "track your application" gate. Collects a tracking code +
 * phone, sends an SMS OTP, verifies it, then hands the verified status to
 * `children`. A guessed code alone reveals nothing.
 */
export function TrackByOtp<T>({ basePath, accent = 'green', children }: Props<T>) {
  const t = useTranslations('tracking');
  const a = ACCENTS[accent];

  const [phase, setPhase] = useState<'enter' | 'otp' | 'result'>('enter');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestOtp = async () => {
    if (!code.trim() || !PHONE_RE.test(phone.trim())) { setError(t('detailsInvalid')); return; }
    setLoading(true); setError(null);
    try {
      await apiClient.post(`${basePath}/request-otp`, { trackingCode: code.trim(), phone: phone.trim() });
      setPhase('otp');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(apiError(err).code === 'TRACKING_RATE_LIMITED' ? t('rateLimited') : t('genericError'));
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setError(t('otpRequired')); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await apiClient.post(`${basePath}/verify-otp`, { trackingCode: code.trim(), phone: phone.trim(), otp: otp.trim() });
      setResult((data.data ?? data) as T);
      setPhase('result');
    } catch (err) {
      const c = apiError(err).code;
      setError(
        c === 'TRACKING_OTP_EXPIRED' ? t('otpExpired')
          : c === 'TRACKING_OTP_MAX_ATTEMPTS' ? t('otpMaxAttempts')
          : c === 'TRACKING_RATE_LIMITED' ? t('rateLimited')
          : t('otpInvalid'),
      );
    } finally { setLoading(false); }
  };

  const reset = () => { setPhase('enter'); setOtp(''); setResult(null); setError(null); setResendIn(0); };

  const inputCls = cn('w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 outline-none transition-colors', a.ring);

  if (phase === 'result' && result) {
    return (
      <div className="space-y-4">
        {children(result, reset)}
        <button onClick={reset} className={cn('text-xs font-medium', a.text)}>{t('trackAnother')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-bold text-gray-900">{t('title')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {phase === 'enter' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }} placeholder={t('codePlaceholder')} aria-label={t('codePlaceholder')} className={cn(inputCls, 'pl-9 font-mono')} />
          </div>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} placeholder={t('phonePlaceholder')} aria-label={t('phonePlaceholder')} inputMode="tel" className={inputCls} />
          <p className="text-[11px] text-gray-400">{t('phoneHint')}</p>
          <button onClick={requestOtp} disabled={loading} className={cn('w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2', a.btn)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {loading ? t('sending') : t('sendCode')}
          </button>
        </div>
      )}

      {phase === 'otp' && (
        <div className="space-y-3">
          <div className={cn('rounded-xl border text-sm px-4 py-3 flex gap-2', a.soft)}>
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" /> <span>{t('otpSent')}</span>
          </div>
          <input value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }} placeholder={t('otpPlaceholder')} inputMode="numeric" maxLength={6} className={cn(inputCls, 'text-center text-lg font-mono tracking-[0.4em]')} />
          <button onClick={verifyOtp} disabled={loading} className={cn('w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2', a.btn)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {loading ? t('verifying') : t('verify')}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button onClick={reset} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"><ArrowLeft className="w-3.5 h-3.5" /> {t('changeDetails')}</button>
            <button onClick={requestOtp} disabled={resendIn > 0 || loading} className={cn('font-medium disabled:text-gray-400', a.text)}>
              {resendIn > 0 ? t('resendIn', { s: resendIn }) : t('resend')}
            </button>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">{error}</div>}
    </div>
  );
}

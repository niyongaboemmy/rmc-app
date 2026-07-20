'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Search, Loader2, CheckCircle2, XCircle, Ban, AlertTriangle, ShieldCheck, ArrowLeft, KeyRound,
} from 'lucide-react';
import {
  jobsApi,
  JOB_STATUS_COLORS,
  type JobApplicationPublicStatus,
  type JobApplicationStatus,
} from '@/lib/jobsApi';
import { cn } from '@/lib/utils';

const PUBLIC_FLOW = ['submitted', 'review', 'shortlisted', 'decision'] as const;
const STAGE_TO_STATUS: Record<(typeof PUBLIC_FLOW)[number], string> = {
  submitted: 'submitted', review: 'under_review', shortlisted: 'shortlisted', decision: 'accepted',
};
const RESEND_SECONDS = 60;

function stepIndexFor(status: JobApplicationStatus): number {
  switch (status) {
    case 'submitted': return 0;
    case 'under_review':
    case 'more_info_requested': return 1;
    case 'shortlisted': return 2;
    case 'accepted': return 3;
    default: return 0;
  }
}

function apiError(err: unknown): { code?: string; message?: string } {
  const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
  return e?.response?.data?.error ?? {};
}

/** Map a backend error code to a specific, translated message the user understands. */
function messageForCode(t: ReturnType<typeof useTranslations>, code?: string): string {
  switch (code) {
    case 'TRACKING_CODE_NOT_FOUND': return t('trackCodeNotFound');
    case 'TRACKING_RATE_LIMITED': return t('trackRateLimited');
    case 'TRACKING_OTP_EXPIRED': return t('trackOtpExpired');
    case 'TRACKING_OTP_MAX_ATTEMPTS': return t('trackOtpMaxAttempts');
    case 'TRACKING_OTP_NONE': return t('trackOtpNone');
    case 'TRACKING_OTP_INVALID': return t('trackOtpInvalid');
    case 'TRACKING_SESSION_INVALID': return t('trackSessionInvalid');
    default: return t('trackGenericError');
  }
}

export function JobsTrackByNumber() {
  const t = useTranslations('services.jobs.status');
  const { locale } = useParams<{ locale: string }>();

  const [phase, setPhase] = useState<'enter' | 'otp' | 'result'>('enter');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobApplicationPublicStatus | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestOtp = async () => {
    if (!code.trim()) { setError(t('trackCodeRequired')); return; }
    setLoading(true);
    setError(null);
    try {
      const { phoneHint: hint } = await jobsApi.trackRequestOtp(code);
      setPhoneHint(hint ?? '');
      setPhase('otp');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(messageForCode(t, apiError(err).code));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setError(t('trackOtpRequired')); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await jobsApi.trackVerifyOtp(code, otp);
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(messageForCode(t, apiError(err).code));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('enter'); setOtp(''); setResult(null); setError(null); setResendIn(0); setPhoneHint('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t('trackTitle')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('trackSubtitle')}</p>
      </div>

      {/* Step 1 — tracking code only */}
      {phase === 'enter' && (
        <div className="space-y-3">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') requestOtp(); }}
            placeholder={t('trackPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-[11px] text-gray-400">{t('trackCodeHint')}</p>
          <button
            onClick={requestOtp}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? t('trackSending') : t('trackSendCode')}
          </button>
        </div>
      )}

      {/* Step 2 — OTP */}
      {phase === 'otp' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm px-4 py-3 flex gap-2">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{phoneHint ? t('trackOtpSentTo', { phone: phoneHint }) : t('trackOtpSent')}</span>
          </div>
          <input
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') verifyOtp(); }}
            placeholder={t('trackOtpPlaceholder')}
            inputMode="numeric"
            maxLength={6}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-center text-lg font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            onClick={verifyOtp}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? t('trackVerifying') : t('trackVerify')}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button onClick={reset} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('trackChangeCode')}
            </button>
            <button
              onClick={requestOtp}
              disabled={resendIn > 0 || loading}
              className="font-medium text-emerald-600 hover:text-emerald-700 disabled:text-gray-400"
            >
              {resendIn > 0 ? t('trackResendIn', { s: resendIn }) : t('trackResend')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">{error}</div>
      )}

      {/* Step 3 — result */}
      {phase === 'result' && result && (
        <TrackingResult result={result} locale={locale} onReset={reset} t={t} />
      )}
    </div>
  );
}

function TrackingResult({
  result, locale, onReset, t,
}: {
  result: JobApplicationPublicStatus;
  locale: string;
  onReset: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const isTerminal = result.status === 'rejected' || result.status === 'cancelled';
  const isAccepted = result.status === 'accepted';
  const currentIndex = stepIndexFor(result.status);
  const stageDate = (stage: (typeof PUBLIC_FLOW)[number]) => {
    const entry = result.statusHistory?.find((h) => h.toStatus === STAGE_TO_STATUS[stage]);
    return entry ? new Date(entry.changedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined;
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900">{result.positionAppliedFor}</p>
          <p className="text-xs text-gray-400 font-mono">{result.trackingCode} · {result.fullNames}</p>
        </div>
        <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', JOB_STATUS_COLORS[result.status])}>
          {t(`statusLabel.${result.status}`)}
        </span>
      </div>

      {result.status === 'rejected' && <Note tone="red" icon={<XCircle className="w-5 h-5" />} title={t('banner.rejectedTitle')} text={result.rejectionReason || t('banner.rejectedText')} />}
      {result.status === 'cancelled' && <Note tone="gray" icon={<Ban className="w-5 h-5" />} title={t('banner.cancelledTitle')} text={t('banner.cancelledText')} />}
      {result.status === 'more_info_requested' && <Note tone="amber" icon={<AlertTriangle className="w-5 h-5" />} title={t('banner.moreInfoTitle')} text={result.moreInfoRequested || t('banner.moreInfoText')} />}

      {!isTerminal && (
        <ol className="relative pt-1">
          <div className="absolute start-[11px] top-3 bottom-3 w-px bg-gray-200" />
          {PUBLIC_FLOW.map((stage, i) => {
            const done = i < currentIndex || (isAccepted && i <= currentIndex);
            const active = !done && i === currentIndex;
            const date = done ? stageDate(stage) : undefined;
            return (
              <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
                <span className={cn(
                  'relative z-10 w-6 h-6 shrink-0 rounded-full flex items-center justify-center ring-4 ring-gray-50',
                  done && 'bg-emerald-600 text-white',
                  active && 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white',
                  !done && !active && 'bg-gray-200 text-gray-400',
                )}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </span>
                <div className={cn('pt-0.5 flex-1', !done && !active && 'opacity-50')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-sm font-semibold', active ? 'text-emerald-700' : 'text-gray-900')}>{t(`stages.${stage}`)}</p>
                    {date && <span className="text-xs text-gray-400 shrink-0">{date}</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{t(`stageDesc.${stage}`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button onClick={onReset} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">{t('trackAnother')}</button>
    </div>
  );
}

function Note({ tone, icon, title, text }: { tone: 'red' | 'gray' | 'amber'; icon: React.ReactNode; title: string; text: string }) {
  const tones = {
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  } as const;
  const iconTones = { red: 'text-red-600', gray: 'text-gray-500', amber: 'text-amber-600' } as const;
  return (
    <div className={cn('flex gap-3 border rounded-xl p-4', tones[tone])}>
      <span className={cn('shrink-0 mt-0.5', iconTones[tone])}>{icon}</span>
      <div>
        <p className="font-bold text-sm mb-0.5">{title}</p>
        <p className="text-xs leading-relaxed opacity-80">{text}</p>
      </div>
    </div>
  );
}

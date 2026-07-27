'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Loader2, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { OtpInput } from '@/components/ui/OtpInput';

const RESEND_SECONDS = 60;

const ACCENTS = {
  green: { btn: 'bg-rmc-green hover:bg-rmc-green-dark focus:ring-rmc-green', ring: 'focus:ring-rmc-green focus:border-transparent', text: 'text-rmc-green', soft: 'bg-rmc-green-light/60 border-rmc-green/20 text-rmc-green-dark' },
  emerald: { btn: 'bg-rmc-green hover:bg-rmc-green-dark focus:ring-rmc-green', ring: 'focus:ring-rmc-green', text: 'text-rmc-green', soft: 'bg-rmc-green-light border-rmc-green-light text-rmc-green-dark' },
  rose: { btn: 'bg-rmc-green hover:bg-rmc-green-dark focus:ring-rmc-green', ring: 'focus:ring-rmc-green', text: 'text-rmc-green', soft: 'bg-rmc-green-light border-rmc-green-light text-rmc-green-dark' },
} as const;

function apiError(err: unknown): { code?: string; message?: string } {
  const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
  return e?.response?.data?.error ?? {};
}

/** Map a backend error code to a specific, translated message the user understands. */
function messageForCode(t: ReturnType<typeof useTranslations>, code?: string): string {
  switch (code) {
    case 'TRACKING_CODE_NOT_FOUND': return t('codeNotFound');
    case 'TRACKING_RATE_LIMITED': return t('rateLimited');
    case 'TRACKING_OTP_EXPIRED': return t('otpExpired');
    case 'TRACKING_OTP_MAX_ATTEMPTS': return t('otpMaxAttempts');
    case 'TRACKING_OTP_NONE': return t('otpNone');
    case 'TRACKING_OTP_INVALID': return t('otpInvalid');
    case 'TRACKING_SESSION_INVALID': return t('sessionInvalid');
    default: return t('genericError');
  }
}

/**
 * The verified session, for the rare screen that must call back with the
 * applicant's identity — e.g. Hajj lets them re-upload a requested document.
 * Optional third argument, so existing callers are unaffected.
 */
export interface TrackedSession {
  /** Short-lived token from verify-otp; send as `Authorization: Bearer`. */
  token: string;
  /** Re-reads the status from `${basePath}/session` and re-renders. */
  refresh: () => Promise<void>;
}

interface Props<T> {
  /** e.g. '/hajj/applications/track', '/marriage/applications/track'. */
  basePath: string;
  accent?: keyof typeof ACCENTS;
  /** Per-service heading; falls back to the shared `tracking` namespace. */
  title?: string;
  subtitle?: string;
  /**
   * Per-service wording for the first field. Services differ in WHAT they accept
   * — Hajj takes the application number or the tracking code, marriage takes the
   * tracking code only — and telling an applicant to type the wrong identifier
   * is a guaranteed dead end. Defaults to the shared `tracking` namespace.
   */
  codePlaceholder?: string;
  codeHint?: string;
  /**
   * Called the moment the OTP is verified, before anything renders.
   *
   * For services whose result is a whole page rather than a panel — tenders hands
   * the bidder their full, editable bid — this is where the caller stashes the
   * session token and navigates away. `children` is then never reached, so it is
   * optional; a service that renders in place leaves this unset instead.
   */
  onVerified?: (result: T, session: TrackedSession) => void;
  /** Rendered once the phone OTP is verified. Omit when `onVerified` navigates away. */
  children?: (result: T, reset: () => void, session: TrackedSession) => React.ReactNode;
}

/**
 * Reusable, secure "track your application" gate. The applicant enters the
 * identifier their service accepts and presses Check; an SMS OTP is sent to the
 * phone they applied with (never re-typed) and collected in a modal. Once
 * verified, the status is handed to `children` — the identifier alone reveals
 * nothing.
 */
export function TrackByOtp<T>({
  basePath,
  accent = 'green',
  title,
  subtitle,
  codePlaceholder,
  codeHint,
  onVerified,
  children,
}: Props<T>) {
  const t = useTranslations('tracking');
  const a = ACCENTS[accent];

  // The OTP step is a modal layered over the (still-visible) code form, so
  // 'otp' is really "modal open" rather than a screen the form is replaced by.
  const [phase, setPhase] = useState<'enter' | 'otp' | 'result'>('enter');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [resendIn, setResendIn] = useState(0);
  // verify-otp returns `{ token, ...status }`; keep the token so a child can act
  // as the applicant without re-verifying.
  const [token, setToken] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestOtp = async () => {
    if (!code.trim()) { setError(t('codeRequired')); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await apiClient.post(`${basePath}/request-otp`, { trackingCode: code.trim() });
      const payload = (data.data ?? data) as { phoneHint?: string };
      setPhoneHint(payload?.phoneHint ?? '');
      setOtp('');
      setPhase('otp');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(messageForCode(t, apiError(err).code));
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setError(t('otpRequired')); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await apiClient.post(`${basePath}/verify-otp`, { trackingCode: code.trim(), otp: otp.trim() });
      const payload = (data.data ?? data) as T & { token?: string };
      const freshToken = payload?.token ?? '';
      setToken(freshToken);
      setResult(payload as T);
      setPhase('result');
      // Passed the token directly rather than through `refresh`'s closure: the
      // state set above has not committed yet, so a navigating caller reading
      // `token` here would get the previous (empty) value.
      onVerified?.(payload as T, {
        token: freshToken,
        refresh: () => refreshWith(freshToken),
      });
    } catch (err) {
      setError(messageForCode(t, apiError(err).code));
    } finally { setLoading(false); }
  };

  const reset = () => { setPhase('enter'); setOtp(''); setResult(null); setError(null); setResendIn(0); setPhoneHint(''); setToken(''); };

  /**
   * Close the OTP modal without discarding the typed code, so "use a different
   * code" drops the applicant back on the form with their entry still there.
   */
  const closeOtp = () => { setPhase('enter'); setOtp(''); setError(null); };

  /**
   * Re-read the status with a token we already hold (no new OTP). Takes the token
   * explicitly so it can also be handed to `onVerified`, which fires before the
   * `setToken` above has committed and would otherwise close over the old value.
   */
  const refreshWith = async (t: string) => {
    if (!t) return;
    const { data } = await apiClient.get(`${basePath}/session`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    setResult((data.data ?? data) as T);
  };

  const refresh = () => refreshWith(token);

  const inputCls = cn('w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-900 outline-none transition-colors', a.ring);

  // With `onVerified` the caller has navigated away by now, so there is nothing
  // to render in place — fall through to the form rather than showing an empty
  // result shell behind the transition.
  if (phase === 'result' && result && children) {
    return (
      <div className="space-y-4">
        {children(result, reset, { token, refresh })}
        <button onClick={reset} className={cn('text-xs font-medium', a.text)}>{t('trackAnother')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-bold text-gray-900">{title ?? t('title')}</h2>
        <p className="text-xs text-gray-400 mt-1">{subtitle ?? t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') requestOtp(); }} placeholder={codePlaceholder ?? t('codePlaceholder')} aria-label={codePlaceholder ?? t('codePlaceholder')} className={cn(inputCls, 'pl-9 font-mono')} />
        </div>
        <p className="text-[11px] text-gray-400">{codeHint ?? t('codeHint')}</p>
        <button onClick={requestOtp} disabled={loading} className={cn('w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2', a.btn)}>
          {loading && phase === 'enter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {loading && phase === 'enter' ? t('sending') : t('check')}
        </button>
        {/* Enter-phase errors live under the form; OTP errors live in the modal. */}
        {error && phase === 'enter' && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">{error}</div>}
      </div>

      <Modal open={phase === 'otp'} onClose={closeOtp} size="sm">
        <ModalHeader>
          <ModalTitle>{t('otpTitle')}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4" onKeyDown={(e) => { if (e.key === 'Enter') verifyOtp(); }}>
            <div className={cn('rounded-xl border text-sm px-4 py-3 flex gap-2', a.soft)}>
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" /> <span>{phoneHint ? t('otpSentTo', { phone: phoneHint }) : t('otpSent')}</span>
            </div>

            <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(null); }} disabled={loading} autoFocus />

            {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">{error}</div>}

            <div className="flex items-center justify-between text-xs">
              <button onClick={closeOtp} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"><ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('changeCode')}</button>
              <button onClick={requestOtp} disabled={resendIn > 0 || loading} className={cn('font-medium disabled:text-gray-400', a.text)}>
                {resendIn > 0 ? t('resendIn', { s: resendIn }) : t('resend')}
              </button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button onClick={verifyOtp} disabled={loading || otp.trim().length < 6} className={cn('w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2', a.btn)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {loading ? t('verifying') : t('verify')}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

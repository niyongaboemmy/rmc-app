'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { apiClient } from '@/lib/api';

type SetupStep = 'idle' | 'sending' | 'verify' | 'disabling';

interface StatusResponse {
  enabled: boolean;
  maskedPhone: string | null;
}

interface SetupResponse {
  maskedPhone: string;
  expiresAt: string;
}

const ShieldOnIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ShieldOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v4m0 4h.01" />
  </svg>
);

export function TwoFactorSection() {
  const [status, setStatus]       = useState<StatusResponse | null>(null);
  const [step, setStep]           = useState<SetupStep>('idle');
  const [maskedPhone, setMasked]  = useState('');
  const [otp, setOtp]             = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: StatusResponse }>('/auth/2fa/status');
      setStatus(res.data.data);
    } catch { /* silently ignore if endpoint not yet reachable */ }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const handleEnable = async () => {
    setError(null);
    setLoading(true);
    setStep('sending');
    try {
      const res = await apiClient.post<{ success: boolean; data: SetupResponse }>('/auth/2fa/setup');
      setMasked(res.data.data.maskedPhone);
      setOtp('');
      setStep('verify');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Failed to send OTP');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/2fa/verify-setup', { otp });
      setSuccess('2-Step Verification enabled. Your account is now more secure.');
      setStep('idle');
      setOtp('');
      await loadStatus();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Invalid code. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) { setError('Password is required'); return; }
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/2fa/disable', { password });
      setSuccess('2-Step Verification disabled.');
      setStep('idle');
      setPassword('');
      await loadStatus();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Failed to disable. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setStep('idle');
    setOtp('');
    setPassword('');
    setError(null);
  };

  const isEnabled = status?.enabled ?? false;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex-shrink-0 ${isEnabled ? 'text-rmc-green' : 'text-gray-400'}`}>
            {isEnabled ? <ShieldOnIcon /> : <ShieldOffIcon />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">2-Step Verification</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEnabled
                ? <>Active · Code sent to <span className="font-medium text-gray-700">{status?.maskedPhone}</span></>
                : 'Add an extra layer of security to your account via SMS.'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {/* Alerts */}
      {error   && <Alert variant="error"   message={error}   />}
      {success && <Alert variant="success" message={success} />}

      {/* ── Enable flow ── */}
      {!isEnabled && step === 'idle' && (
        <Button onClick={handleEnable} isLoading={loading} variant="outline" size="sm">
          Enable 2-Step Verification
        </Button>
      )}

      {!isEnabled && step === 'sending' && (
        <p className="text-sm text-gray-400 animate-pulse">Sending OTP to your phone…</p>
      )}

      {!isEnabled && step === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{maskedPhone}</span>
          </p>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
          <div className="flex gap-3">
            <Button onClick={handleVerifySetup} isLoading={loading} disabled={otp.length < 6} size="sm">
              Confirm &amp; Enable
            </Button>
            <Button onClick={cancel} variant="outline" size="sm" disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Disable flow ── */}
      {isEnabled && step === 'idle' && (
        <Button
          onClick={() => { setStep('disabling'); setError(null); setSuccess(null); }}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
        >
          Disable 2-Step Verification
        </Button>
      )}

      {isEnabled && step === 'disabling' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your password to confirm you want to disable 2-Step Verification.
          </p>
          <PasswordInput
            placeholder="Your current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <div className="flex gap-3">
            <Button
              onClick={handleDisable}
              isLoading={loading}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
            >
              Disable
            </Button>
            <Button onClick={cancel} variant="outline" size="sm" disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

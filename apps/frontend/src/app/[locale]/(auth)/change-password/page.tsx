'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// ── Validation ─────────────────────────────────────────────────────────────────

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])/, 'Must include uppercase, lowercase, number & special char'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

// ── Password rule indicator ────────────────────────────────────────────────────

const RULES = [
  { label: 'At least 8 characters',            test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter',              test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter',              test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number',                        test: (v: string) => /\d/.test(v) },
  { label: 'One special character (@$!%*?&…)',  test: (v: string) => /[@$!%*?&\-_#]/.test(v) },
];

function PasswordRules({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="space-y-1.5 mt-2">
      {RULES.map(({ label, test }) => {
        const ok = test(value);
        return (
          <li key={label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-600' : 'text-gray-400'}`}>
            {ok
              ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
              : <XCircle     className="w-3.5 h-3.5 shrink-0 text-gray-300" />
            }
            {label}
          </li>
        );
      })}
    </ul>
  );
}

// ── Success countdown ──────────────────────────────────────────────────────────

function SuccessState({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="flex flex-col items-center py-8 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center ring-4 ring-green-100">
        <ShieldCheck className="w-8 h-8 text-rmc-green" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Password changed!</h2>
        <p className="text-sm text-gray-500 mt-1">
          All active sessions have been revoked. Redirecting to login in{' '}
          <span className="font-semibold text-rmc-green">{count}s</span>…
        </p>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
        <div
          className="h-full bg-rmc-green rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${((3 - count) / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

function ChangePasswordForm() {
  const { locale } = useParams<{ locale: string }>();
  const router     = useRouter();
  const { logout } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const newPasswordValue = watch('newPassword') ?? '';

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = async () => {
    await logout();
    router.push(`/${locale}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Green header ── */}
      <div className="bg-gradient-to-br from-rmc-green to-rmc-green-dark pt-10 pb-20 px-4">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-green-200 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Change Password</h1>
              <p className="text-green-200 text-sm mt-0.5">Keep your account secure with a strong password</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="max-w-lg mx-auto px-4 -mt-10 pb-12">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Security note */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-50">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                After changing your password, <strong>all active sessions will be revoked</strong> and you will be redirected to log in again.
              </p>
            </div>
          </div>

          <div className="p-6">
            {success ? (
              <SuccessState onDone={handleDone} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {apiError && <Alert variant="error" message={apiError} />}

                <PasswordInput
                  label="Current Password"
                  autoComplete="current-password"
                  error={errors.currentPassword?.message}
                  {...register('currentPassword')}
                />

                <div>
                  <PasswordInput
                    label="New Password"
                    autoComplete="new-password"
                    showStrength
                    error={errors.newPassword?.message}
                    {...register('newPassword')}
                  />
                  <PasswordRules value={newPasswordValue} />
                </div>

                <PasswordInput
                  label="Confirm New Password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <div className="pt-1">
                  <Button type="submit" isLoading={isLoading} className="w-full">
                    Change Password
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <ChangePasswordForm />
    </ProtectedRoute>
  );
}

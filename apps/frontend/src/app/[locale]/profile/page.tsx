'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TwoFactorSection } from '@/components/auth/TwoFactorSection';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { Input } from '@/components/ui/Input';
import { PhoneInput, toE164, toLocalPhone } from '@/components/ui/PhoneInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  profilePhotoUrl?: string | null;
  role: string;
  status: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  membershipNumber?: string;
  joinedDate?: string;
  createdAt?: string;
  mfaEnabled?: boolean;
  twoFactorEnabled?: boolean;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  firstName:   z.string().min(1, 'First name is required'),
  lastName:    z.string().min(1, 'Last name is required'),
  email:       z.string().email('Enter a valid email address').min(1, 'Email is required'),
  phone:       z.string()
    .min(1, 'Phone is required')
    .regex(/^7[2389]\d{7}$/, 'Enter a valid Rwanda number: 7XXXXXXXX'),
  dateOfBirth: z.string().optional(),
  gender:      z.enum(['male', 'female', '']).optional(),
});
type FormData = z.infer<typeof schema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: 'green' | 'yellow' | 'gray' | 'blue' }) {
  const cls = {
    green:  'bg-green-50 text-green-700 ring-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
    gray:   'bg-gray-100 text-gray-600 ring-gray-200',
    blue:   'bg-blue-50 text-blue-700 ring-blue-200',
  }[variant];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${cls}`}>
      {label}
    </span>
  );
}

// ── Tab type ───────────────────────────────────────────────────────────────────

type Tab = 'info' | 'security';

// ── Main page ─────────────────────────────────────────────────────────────────

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const { locale }            = useParams<{ locale: string }>();
  const router                = useRouter();

  const [activeTab, setActiveTab]     = useState<Tab>('info');
  const [profile, setProfile]         = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Pending photo URL — set when AvatarUploader finishes uploading
  const pendingPhotoRef = useRef<string | null>(null);

  // Form state
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: ProfileData }>('/auth/profile');
      const p   = res.data.data;
      setProfile(p);
      reset({
        firstName:   p.firstName,
        lastName:    p.lastName,
        email:       p.email,
        phone:       toLocalPhone(p.phone),
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        gender:      (p.gender as FormData['gender']) ?? '',
      });
    } catch { /* handled by axios interceptor */ }
    finally { setLoadingProfile(false); }
  }, [reset]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        firstName:  data.firstName,
        lastName:   data.lastName,
        email:      data.email,
        phone:      toE164(data.phone),
        ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
        ...(data.gender       ? { gender: data.gender }           : {}),
        ...(pendingPhotoRef.current !== null ? { profilePhotoUrl: pendingPhotoRef.current } : {}),
      };
      await apiClient.put('/auth/profile', payload);
      pendingPhotoRef.current = null;
      await loadProfile();
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setSaveError(e?.response?.data?.error?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading profile…</span>
        </div>
      </div>
    );
  }

  const statusVariant = (profile?.status === 'active' ? 'green' : profile?.status === 'pending' ? 'yellow' : 'gray') as 'green' | 'yellow' | 'gray';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero / header ── */}
      <div className="bg-gradient-to-br from-rmc-green to-rmc-green-dark pt-10 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-green-200 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <AvatarUploader
            currentUrl={profile?.profilePhotoUrl}
            initials={initials(profile?.firstName, profile?.lastName)}
            size={96}
            onUploaded={(url) => {
              pendingPhotoRef.current = url;
              setProfile((p) => p ? { ...p, profilePhotoUrl: url } : p);
            }}
          />
          <div className="text-center sm:text-left sm:pb-1">
            <h1 className="text-2xl font-bold text-white leading-tight">
              {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="text-green-100 text-sm mt-0.5">{profile?.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <Badge label={profile?.role ?? 'user'} variant="blue" />
              <Badge label={profile?.status ?? ''} variant={statusVariant} />
              {profile?.membershipNumber && (
                <Badge label={profile.membershipNumber} variant="gray" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-12 space-y-4">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['info', 'security'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={[
                  'flex-1 py-3.5 text-sm font-semibold transition-colors duration-150',
                  activeTab === t
                    ? 'text-rmc-green border-b-2 border-rmc-green -mb-px'
                    : 'text-gray-400 hover:text-gray-700',
                ].join(' ')}
              >
                {t === 'info' ? 'Profile Information' : 'Security'}
              </button>
            ))}
          </div>

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <div className="p-6 space-y-6">
              {saveSuccess && (
                <Alert variant="success" message="Profile updated successfully." />
              )}
              {saveError && (
                <Alert variant="error" message={saveError} />
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    error={errors.firstName?.message}
                    {...register('firstName')}
                  />
                  <Input
                    label="Last Name"
                    error={errors.lastName?.message}
                    {...register('lastName')}
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    autoComplete="email"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  <PhoneInput
                    label="Phone Number"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>

                {/* DOB + Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    {...register('dateOfBirth')}
                  />
                  <Select
                    label="Gender"
                    placeholder="— Select —"
                    {...register('gender')}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>

                {/* Read-only account info */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ReadOnlyField label="Membership No." value={profile?.membershipNumber ?? '—'} />
                  <ReadOnlyField label="Member since" value={formatDate(profile?.joinedDate)} />
                  <ReadOnlyField label="Account status" value={profile?.status ?? '—'} />
                </div>

                {/* Photo hint */}
                <p className="text-xs text-gray-400 text-center">
                  Click your avatar above to change your profile photo. It will be saved with your profile.
                </p>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={saving}
                    disabled={!isDirty && pendingPhotoRef.current === null}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Security tab ── */}
          {activeTab === 'security' && (
            <div className="p-6 space-y-4">
              <button
                onClick={() => setActiveTab('info')}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors -mt-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Profile
              </button>
              {/* Change password */}
              <div className="rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Update your password. All active sessions will be revoked.</p>
                </div>
                <Link href={`/${locale}/change-password`}>
                  <Button variant="outline" size="sm">Change</Button>
                </Link>
              </div>

              {/* Authenticator app */}
              <div className="rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Authenticator App (TOTP)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {profile?.mfaEnabled
                      ? 'Active — Login requires a code from your authenticator app.'
                      : 'Not enabled. Use Google Authenticator or similar for extra security.'}
                  </p>
                </div>
                <Badge
                  label={profile?.mfaEnabled ? 'On' : 'Off'}
                  variant={profile?.mfaEnabled ? 'green' : 'gray'}
                />
              </div>

              {/* SMS 2FA */}
              <TwoFactorSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiClient } from '@/lib/api';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', '']).optional(),
});

type FormData = z.infer<typeof schema>;

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const { locale } = useParams<{ locale: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dateOfBirth: '',
      gender: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setApiError(null);
    setSuccess(false);
    try {
      await apiClient.put('/auth/profile', {
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
        ...(data.gender ? { gender: data.gender } : {}),
      });
      await refreshUser();
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message || 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-rmc-green flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-rmc-green/10 text-rmc-green px-2 py-0.5 rounded-full font-medium capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Edit profile */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h2>
          {success && <Alert variant="success" message="Profile updated successfully" className="mb-4" />}
          {apiError && <Alert variant="error" message={apiError} className="mb-4" />}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <Select
              label="Gender"
              placeholder="— Select —"
              {...register('gender')}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
            <Button type="submit" isLoading={isLoading}>Save Changes</Button>
          </form>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Security</h2>
          <p className="text-gray-500 text-sm mb-4">Update your password. All active sessions will be revoked.</p>
          <Link href={`/${locale}/change-password`}>
            <Button variant="outline">Change Password</Button>
          </Link>
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

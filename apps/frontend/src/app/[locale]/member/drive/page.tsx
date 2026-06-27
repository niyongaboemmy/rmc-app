'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { DriveLayout } from '@/components/drive/DriveLayout';
import { Permission } from '@/lib/permissions';

export default function MemberDrivePage() {
  const { user, hasPermission, isLoading } = useAuth();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/${locale}/login`);
  }, [user, isLoading, router, locale]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission(Permission.DRIVE_VIEW)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">You don&apos;t have access to My Drive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Navbar />
      <div className="flex-1 min-h-0">
        <DriveLayout title="My Drive" />
      </div>
    </div>
  );
}

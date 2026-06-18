'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { PrayerTimesEditor } from '@/components/admin/PrayerTimesEditor';

export default function PrayerTimesPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <PrayerTimesPageContent />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function PrayerTimesPageContent() {
  const { locale } = useParams<{ locale: string }>();
  return <PrayerTimesEditor backHref={`/${locale}/admin/content`} />;
}

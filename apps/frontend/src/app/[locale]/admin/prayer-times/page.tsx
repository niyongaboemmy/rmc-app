'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { PrayerTimesEditor } from '@/components/admin/PrayerTimesEditor';

export default function PrayerTimesPage() {
  return (
    <ProtectedRoute permissions={[Permission.PRAYER_TIMES_VIEW]}>
      <ToastProvider>
        <PrayerTimesEditor />
      </ToastProvider>
    </ProtectedRoute>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { LessonsManager } from '@/components/dawah/LessonsManager';

/**
 * Admin lesson builder for one course. A thin shell now: the whole builder —
 * fetch, ordered list, drag-reorder, add/edit/delete and the lesson modal — lives
 * in the reusable `LessonsManager`, which is ALSO mounted in place on a course's
 * own public page. This page adds only the admin chrome (route guard + the
 * back-to-courses link).
 */
export default function AdminDawahLessonsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>
      <ToastProvider>
        <LessonsPage />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function LessonsPage() {
  const t = useTranslations('admin.dawah');
  const { locale, id: courseId } = useParams<{ locale: string; id: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/dawah/courses`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
      >
        <ArrowLeft className="h-4 w-4" /> {t('lessons.backToCourses')}
      </Link>
      <LessonsManager courseId={courseId} canManage={canManage} />
    </div>
  );
}

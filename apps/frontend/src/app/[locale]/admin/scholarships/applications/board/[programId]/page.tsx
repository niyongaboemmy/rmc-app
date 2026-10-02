'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ScholarshipKanbanBoard } from '@/components/admin/scholarship/ScholarshipKanbanBoard';
import { scholarshipAdminApi } from '@/lib/scholarshipAdminApi';
import type { ScholarshipProgram } from '@/lib/scholarshipApi';

/**
 * The review pipeline for ONE scholarship.
 *
 * Scoped to a single call rather than showing every application at once: the
 * board exists to compare candidates against each other, and applicants for
 * different awards are not competing. Same reasoning as the per-tender board.
 */
export default function AdminScholarshipBoardPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_VIEW]}>
      <ToastProvider>
        <BoardView />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function BoardView() {
  const { locale, programId } = useParams<{ locale: string; programId: string }>();
  const { hasPermission } = useAuth();
  const [program, setProgram] = useState<ScholarshipProgram | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    scholarshipAdminApi
      .listPrograms()
      .then((all) => !cancelled && setProgram(all.find((p) => p.id === programId) ?? null))
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [programId]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${locale}/admin/scholarships/applications`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Applications
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-gray-900">
          <LayoutGrid className="h-5 w-5 text-rmc-green" />
          {program?.title ?? 'Review board'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} application{total === 1 ? '' : 's'} · drag a card, or use its Move button
        </p>
      </div>

      <ScholarshipKanbanBoard
        locale={locale}
        programId={programId}
        canApprove={hasPermission(Permission.SCHOLARSHIP_APPROVE)}
        onTotalChange={setTotal}
      />
    </div>
  );
}

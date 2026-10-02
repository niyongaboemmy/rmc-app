'use client';

import { GraduationCap } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { ScholarshipProgramsTab } from '@/components/admin/scholarship/ScholarshipProgramsTab';

/**
 * Composing and publishing scholarships.
 *
 * Its own route, not a tab, so the sidebar submenu has somewhere to link. Gated
 * on SCHOLARSHIP_VIEW to open — a reviewer may legitimately want to read the
 * scholarship they are judging against — while the create/edit/publish controls
 * inside require SCHOLARSHIP_MANAGE.
 */
export default function AdminScholarshipProgramsPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_VIEW]}>
      <ProgramsView />
    </ProtectedRoute>
  );
}

function ProgramsView() {
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <GraduationCap className="h-6 w-6 text-rmc-green" />
          Manage scholarships
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Compose a scholarship, then publish it when it is complete.
        </p>
      </div>

      <ScholarshipProgramsTab canManage={hasPermission(Permission.SCHOLARSHIP_MANAGE)} />
    </div>
  );
}

'use client';

import { GraduationCap } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, COURSES_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public Courses listing. The courses are records managed under
 * Dawah → Courses; this is the heading and the two states the page can land in.
 */
const GROUPS: TriFieldGroup[] = [
  {
    title: 'Page heading',
    fields: [
      { path: ['header', 'title'], label: 'Heading', rows: 1 },
      { path: ['header', 'subtitle'], label: 'Subheading', rows: 2 },
    ],
  },
  {
    title: 'Empty state',
    note: 'Shown when no courses match — or when none have been published yet.',
    fields: [
      { path: ['empty', 'title'], label: 'Heading', rows: 1 },
      { path: ['empty', 'body'], label: 'Message', rows: 2 },
    ],
  },
  {
    title: 'Error state',
    note: 'Shown when the course list cannot be loaded.',
    fields: [
      { path: ['error', 'title'], label: 'Heading', rows: 1 },
      { path: ['error', 'body'], label: 'Message', rows: 2 },
    ],
  },
];

export default function CoursesContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor
          sectionKey={ContentKeys.courses}
          defaults={COURSES_DEFAULT}
          groups={GROUPS}
          title="Courses Page"
          blurb="Heading and the empty / error messages on /dawah/courses"
          icon={GraduationCap}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          publicPath="/dawah/courses"
          records={{
            label: 'Dawah Courses',
            href: '/admin/dawah/courses',
            note: 'The courses listed on the page — lessons, categories and publishing',
          }}
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}

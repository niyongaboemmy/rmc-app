'use client';

import { Library } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, LIBRARY_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public Library listing. The books are records managed under
 * Dawah → Library; this is the heading and the two states the page can land in.
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
    note: 'Shown when no books match — or when none have been published yet.',
    fields: [
      { path: ['empty', 'title'], label: 'Heading', rows: 1 },
      { path: ['empty', 'body'], label: 'Message', rows: 2 },
    ],
  },
  {
    title: 'Error state',
    note: 'Shown when the library cannot be loaded.',
    fields: [
      { path: ['error', 'title'], label: 'Heading', rows: 1 },
      { path: ['error', 'body'], label: 'Message', rows: 2 },
    ],
  },
];

export default function LibraryContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor
          sectionKey={ContentKeys.library}
          defaults={LIBRARY_DEFAULT}
          groups={GROUPS}
          title="Library Page"
          blurb="Heading and the empty / error messages on /dawah/library"
          icon={Library}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          publicPath="/dawah/library"
          records={{
            label: 'Dawah Library',
            href: '/admin/dawah/library',
            note: 'The books listed on the page — files, covers and categories',
          }}
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}

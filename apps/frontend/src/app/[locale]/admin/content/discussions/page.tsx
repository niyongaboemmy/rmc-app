'use client';

import { MessagesSquare } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, DISCUSSIONS_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public Discussions listing. The questions and answers are records
 * managed under Dawah → Discussions.
 *
 * Two empty states, not one: "nothing has been published" and "your filters match
 * nothing" are different situations and the page says so.
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
    note: 'Shown when there are no discussions at all.',
    fields: [{ path: ['empty', 'body'], label: 'Message', rows: 2 }],
  },
  {
    title: 'No search results',
    note: 'Shown when a filter or search is applied and nothing matches.',
    fields: [{ path: ['emptyFiltered', 'body'], label: 'Message', rows: 2 }],
  },
  {
    title: 'Error state',
    note: 'Shown when the discussions cannot be loaded.',
    fields: [{ path: ['error', 'body'], label: 'Message', rows: 2 }],
  },
];

export default function DiscussionsContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor
          sectionKey={ContentKeys.discussions}
          defaults={DISCUSSIONS_DEFAULT}
          groups={GROUPS}
          title="Discussions Page"
          blurb="Heading and the empty / no-results / error messages on /dawah/discussions"
          icon={MessagesSquare}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          publicPath="/dawah/discussions"
          records={{
            label: 'Dawah Discussions',
            href: '/admin/dawah/discussions',
            note: 'The questions and answers listed on the page — moderation and publishing',
          }}
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}

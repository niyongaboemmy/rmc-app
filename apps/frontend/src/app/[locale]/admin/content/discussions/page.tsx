'use client';

import { MessagesSquare } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, DISCUSSIONS_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public Discussions pages — the listing, and the chrome around a single
 * entry. The questions and answers themselves are records managed under Dawah →
 * Discussions.
 *
 * Two empty states, not one: "nothing has been published" and "your filters match
 * nothing" are different situations and the page says so.
 *
 * Not everything on those pages is here. Structural labels — the views count, the
 * "Yes"/"No" on the rating buttons, filter placeholders — are UI grammar rather than
 * RMC's editorial voice, and stay in the translation files.
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
  {
    title: 'Single question page',
    note: "The badge over RMC's answer, and the closing invitation to ask.",
    fields: [
      { path: ['detail', 'answerBadge'], label: 'Answer badge', rows: 1 },
      { path: ['detail', 'askPrompt'], label: 'Closing prompt', rows: 1 },
      { path: ['detail', 'askCta'], label: 'Closing button', rows: 1 },
    ],
  },
  {
    title: 'Helpful rating',
    note:
      'Asked under the answer. Readers see only a thank-you; the counts are on ' +
      'Dawah → Discussions. The Yes / No button labels are not editable here.',
    fields: [
      { path: ['detail', 'ratingPrompt'], label: 'Question', rows: 1 },
      { path: ['detail', 'ratingThanks'], label: 'After rating', rows: 1 },
    ],
  },
  {
    title: 'Related questions',
    note: 'Heading over the (up to three) entries offered at the foot of an answer.',
    fields: [{ path: ['detail', 'relatedTitle'], label: 'Heading', rows: 1 }],
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
          blurb="Wording on the discussions listing and on a single question page"
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

import { redirect } from 'next/navigation';

/**
 * Was the scholar review queue — member-written answers held until a scholar released or
 * verified them. Members no longer write answers, so that queue has no contents.
 *
 * It forwards to the submissions queue, which is the closest thing that still exists: the
 * work waiting for a scholar is now unanswered QUESTIONS rather than unreviewed answers.
 */
export default function AdminDiscussionsPendingRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/admin/dawah/discussions/submissions`);
}

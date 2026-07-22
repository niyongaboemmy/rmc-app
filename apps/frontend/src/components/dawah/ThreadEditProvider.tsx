'use client';

import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { EditModeProvider } from '@/contexts/EditModeContext';
import { EditToolbar } from '@/components/cms/EditToolbar';
import { ContentKeys, DISCUSSIONS_DEFAULT } from '@/lib/content-api';

/**
 * Edit-mode shell for a discussion thread (a Server Component page).
 *
 * The thread has no admin-editable COPY — so this is not a copy CMS. It exists only
 * to give a scholar the same on/off "edit mode" toggle the rest of the site uses:
 * off, they see the exact public thread; on, the per-answer verify/un-verify controls
 * and the "answers awaiting review" section appear (`VerifyAnswerControl` and
 * `ThreadPendingAnswers` gate themselves on `useEditMode().editing`).
 *
 * `canEdit = discussions:verify` (the only thing edit mode reveals here), `canSave =
 * false` (nothing to persist), so `EditToolbar` reduces to a plain Edit ⇄ Done switch —
 * no Save/Discard ever appears. The provider still needs a section + defaults; we pass
 * the discussions ones, but with `canSave` false they are only ever read, never written.
 *
 * Wraps a ToastProvider so the review actions inside can toast; it is the single toast
 * host for the thread page.
 */
export function ThreadEditProvider({ children }: { children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  const canVerify = hasPermission(Permission.DISCUSSIONS_VERIFY);

  return (
    <ToastProvider>
      <EditModeProvider
        sectionKey={ContentKeys.discussions}
        defaults={DISCUSSIONS_DEFAULT}
        canEdit={canVerify}
        canSave={false}
      >
        {children}
        <EditToolbar />
      </EditModeProvider>
    </ToastProvider>
  );
}

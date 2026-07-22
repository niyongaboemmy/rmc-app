'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Loader2, X } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { useEditMode } from '@/contexts/EditModeContext';
import { dawahApi, serverMessage } from '@/lib/dawahApi';

/**
 * In-place verify / un-verify for one answer on the public thread page — the
 * scholar's twin of the discussions moderation controls on the listing.
 *
 * Renders ONLY for a `discussions:verify` holder; everyone else (and every
 * anonymous reader) gets nothing, so the public thread is byte-for-byte what it
 * always was.
 *
 * The parent decides WHICH control to offer, from the server-known state:
 *   - the verified answer gets `verified` → an "Un-verify" button;
 *   - community answers get the "Verify" button, but ONLY while the question has
 *     no verified answer yet (the API allows one per question and 409s otherwise —
 *     un-verify the current one first).
 *
 * There's no toast here: verifying visibly moves the answer into (or out of) the
 * gold verified box, and `router.refresh()` re-renders the server page to show
 * exactly that. A failed call surfaces inline instead.
 */
export function VerifyAnswerControl({
  answerId,
  verified = false,
}: {
  answerId: string;
  /** True when this IS the currently-verified answer → show "Un-verify". */
  verified?: boolean;
}) {
  const { hasPermission } = useAuth();
  const { editing } = useEditMode();
  const t = useTranslations('dawah');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Only in edit mode, and only for a verifier — otherwise this is the public view.
  if (!editing || !hasPermission(Permission.DISCUSSIONS_VERIFY)) return null;

  const run = async () => {
    setBusy(true);
    setErr('');
    try {
      if (verified) await dawahApi.admin.discussions.unverify(answerId);
      else await dawahApi.admin.discussions.verify(answerId);
      // The verified answer is server-resolved; re-render to move this answer.
      router.refresh();
    } catch (e) {
      setErr(serverMessage(e) ?? t('discussions.manage.actError'));
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-gray-200 pt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          verified
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-rmc-gold/50 bg-rmc-gold/10 px-3 py-1.5 text-xs font-semibold text-rmc-gold-light transition-colors hover:bg-rmc-gold/20 disabled:opacity-50'
        }
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : verified ? (
          <X className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        )}
        {verified ? t('discussions.review.unverify') : t('discussions.review.verify')}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}

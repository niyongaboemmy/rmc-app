'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Check, Clock, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { useEditMode } from '@/contexts/EditModeContext';
import { dawahApi, serverMessage, type PendingAnswer } from '@/lib/dawahApi';

/**
 * The under-review answers for ONE question, surfaced inline on the public thread
 * page for a scholar. Public readers never see answers held at `pending_review`;
 * without this, a scholar had to leave for the admin queue to act on them. This is
 * that queue, scoped to the question in front of them.
 *
 * Renders ONLY for a `discussions:verify` holder (the server additionally demands a
 * scholar/super-admin role — a 403 surfaces as a toast). Everyone else, and every
 * anonymous reader, gets nothing.
 *
 * There is no per-question pending endpoint, so it filters the global scholar queue
 * by slug — the queue is a review backlog, normally small. After Release/Verify it
 * refetches AND `router.refresh()`es, so the answer both leaves this section and
 * appears in the published/verified list the server renders.
 *
 * Release vs Verify stay TWO visually distinct actions — neutral vs gold — exactly
 * as on the admin queue: Release = "may be seen", Verify = "RMC says this is correct".
 */
export function ThreadPendingAnswers({ slug }: { slug: string }) {
  const { hasPermission } = useAuth();
  const { editing } = useEditMode();
  // Edit mode + verifier only. Gating here (not inside PendingList) means the global
  // pending queue is only fetched once a scholar actually turns edit mode on — the
  // public view never pays for it. The page's ToastProvider hosts the action toasts.
  if (!editing || !hasPermission(Permission.DISCUSSIONS_VERIFY)) return null;
  return <PendingList slug={slug} />;
}

function PendingList({ slug }: { slug: string }) {
  const t = useTranslations('dawah');
  const router = useRouter();
  const { success, error } = useToast();

  const [items, setItems] = useState<PendingAnswer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await dawahApi.admin.discussions.pending();
      setItems(all.filter((a) => a.question?.slug === slug));
    } catch {
      // A failed queue read must not break the public thread — the scholar just
      // sees no review section and can still use the admin queue.
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (a: PendingAnswer, kind: 'release' | 'verify') => {
    setBusyId(a.id);
    try {
      await dawahApi.admin.discussions[kind](a.id);
      success(t(`discussions.review.${kind === 'verify' ? 'verified' : 'released'}`));
      await load();
      // The published/verified lists are server-rendered — re-render to show the
      // answer in its new home.
      router.refresh();
    } catch (err) {
      // Surface the server's actual reason (e.g. a 409 "already verified").
      error(serverMessage(err) ?? t('discussions.review.loadError'));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  // Nothing pending (or not loaded yet) → render nothing at all, so the section
  // never flashes an empty box on a thread with no review backlog.
  if (!loaded || items.length === 0) return null;

  return (
    <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/40 p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <Clock className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-amber-800">
          {t('discussions.review.title')}
          <span className="ms-1.5 font-semibold text-amber-600">({items.length})</span>
        </h2>
      </div>
      <p className="mt-1 text-[11px] text-amber-700/80">{t('discussions.review.subtitle')}</p>

      <ul className="mt-4 space-y-3">
        {items.map((a) => {
          const dir = a.question?.language === 'ar' ? 'rtl' : 'ltr';
          return (
            <li key={a.id} className="rounded-lg border border-amber-200/70 bg-white p-4">
              <div
                dir={dir}
                className="prose prose-sm max-w-none text-gray-700 prose-p:leading-[1.65] prose-a:text-rmc-green"
                dangerouslySetInnerHTML={{ __html: a.bodyHtml }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                <span>{a.author ?? t('discussions.anonymousAnswer')}</span>
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" aria-hidden />
                  {t('discussions.review.waiting', { hours: a.ageHours })}
                </span>
              </div>

              {/* Two DISTINCT actions — neutral Release vs gold Verify. */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => act(a, 'release')}
                  disabled={busyId === a.id}
                  title={t('discussions.review.releaseHelp')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {t('discussions.review.release')}
                </button>
                <button
                  type="button"
                  onClick={() => act(a, 'verify')}
                  disabled={busyId === a.id || a.questionHasVerified}
                  title={a.questionHasVerified ? t('discussions.review.alreadyVerified') : t('discussions.review.verifyHelp')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rmc-gold px-3 py-1.5 text-xs font-bold text-rmc-green-deep transition-colors hover:bg-rmc-gold-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  {t('discussions.review.verify')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

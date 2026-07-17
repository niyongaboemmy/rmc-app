'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GraduationCap, BadgeCheck, Check, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { dawahApi, type PendingAnswer } from '@/lib/dawahApi';

/**
 * Scholar review queue.
 *
 * Gated on DISCUSSIONS_VERIFY — and the SERVER additionally demands the caller's role is
 * actually `scholar` (the §3.2 wildcard fix), so a superadmin who lands here still cannot
 * verify.
 *
 * Release and Verify are TWO VISUALLY DISTINCT actions, never one button with two labels.
 * Release (neutral) = "this may be seen." Verify (gold) = "RMC says this is correct." If
 * they looked alike, a scholar clearing a queue would attach RMC's endorsement to every
 * answer they merely triaged — the exact harm the whole design guards against.
 */
export default function ScholarReviewPage() {
  return (
    <ProtectedRoute permissions={[Permission.DISCUSSIONS_VERIFY]}>
      <ToastProvider>
        <ReviewQueue />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function ReviewQueue() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<PendingAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await dawahApi.admin.discussions.pending());
    } catch {
      error(t('discussions.review.loadError'));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (a: PendingAnswer, kind: 'release' | 'verify') => {
    setBusyId(a.id);
    try {
      await dawahApi.admin.discussions[kind](a.id);
      success(t(`discussions.review.${kind === 'verify' ? 'verified' : 'released'}`));
      await load();
    } catch {
      error(t('discussions.review.loadError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t('discussions.review.title')}</h1>
          <p className="text-sm text-gray-500">{t('discussions.review.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          {t('discussions.review.empty')}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((a) => {
            const dir = a.question?.language === 'ar' ? 'rtl' : 'ltr';
            return (
              <li key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
                {a.question && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{t('discussions.review.onQuestion')}</span>
                    <Link
                      href={`/${locale}/dawah/discussions/${a.question.slug}`}
                      className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-rmc-green"
                    >
                      {a.question.title.slice(0, 60)}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {/* The age alarm: a queue nobody works turns pending answers into a
                        black hole for their authors. */}
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Clock className="h-3 w-3" />
                      {t('discussions.review.waiting', { hours: a.ageHours })}
                    </span>
                  </div>
                )}

                <div
                  dir={dir}
                  className="prose prose-sm mt-3 max-w-none text-gray-700 prose-a:text-rmc-green"
                  dangerouslySetInnerHTML={{ __html: a.bodyHtml }}
                />
                <p className="mt-2 text-[11px] text-gray-400">{a.author ?? t('discussions.anonymousAnswer')}</p>

                {/* Two DISTINCT actions. Release is a plain neutral button; Verify is gold
                    with the badge icon. Their difference is obvious in the UI, not just the
                    API — see the component doc. */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => act(a, 'release')}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {t('discussions.review.release')}
                    </button>
                    <span className="text-[10px] text-gray-400">{t('discussions.review.releaseHelp')}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => act(a, 'verify')}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rmc-gold px-3 py-1.5 text-xs font-bold text-rmc-green-deep transition-colors hover:bg-rmc-gold-light disabled:opacity-50"
                    >
                      {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                      {t('discussions.review.verify')}
                    </button>
                    <span className="text-[10px] text-gray-400">{t('discussions.review.verifyHelp')}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

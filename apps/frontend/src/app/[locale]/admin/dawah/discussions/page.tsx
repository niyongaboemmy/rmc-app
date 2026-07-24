'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShieldAlert, Eye, EyeOff, RotateCcw, Lock, ExternalLink, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { dawahApi, type DiscussionReport, type CategoryPolicy } from '@/lib/dawahApi';

/**
 * Discussion moderation queue.
 *
 * Gated on DISCUSSIONS_MODERATE — NOT DAWAH_MANAGE. A content admin who uploads PDFs has
 * no business hiding a member's religious question unless RMC has specifically trusted
 * them to; that is what the separate permission buys.
 *
 * The queue exists so the moderation log gets READ. Auto-hidden posts (moderator_id NULL
 * on the log) are the crowd's calls awaiting a human's confirmation, and they are the
 * only defence against the report threshold becoming a heckler's veto — so they surface
 * first and are visually distinct.
 */
export default function AdminDiscussionsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DISCUSSIONS_MODERATE]}>
      <ToastProvider>
        <ModerationQueue />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function ModerationQueue() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [reports, setReports] = useState<DiscussionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await dawahApi.admin.discussions.reports());
    } catch {
      error(t('discussions.moderation.loadError'));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (r: DiscussionReport, action: 'hide' | 'restore' | 'lock') => {
    // Only questions are moderatable in this phase (answers arrive in Phase C).
    if (r.targetType !== 'question') return;
    setBusyId(r.id);
    try {
      await dawahApi.admin.discussions.moderate(r.targetId, action);
      success(t(`discussions.moderation.${action}`));
      await load();
    } catch {
      error(t('discussions.moderation.loadError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{t('discussions.moderation.title')}</h1>
          <p className="text-sm text-gray-500">{t('discussions.moderation.subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/dawah/discussions/all`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {t('discussions.manage.title')}
        </Link>
      </div>

      <PolicyPanel />

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg skeleton" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          {t('discussions.moderation.empty')}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-gray-500">
                  {r.targetType}
                </span>
                <span className="font-semibold text-gray-700">
                  {t('discussions.moderation.reason')}: {r.reason}
                </span>
                {r.reporter && (
                  <span className="text-gray-400">
                    {t('discussions.moderation.reporter')} {r.reporter}
                  </span>
                )}
              </div>
              {r.note && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="text-gray-400">{t('discussions.moderation.reasonNote')}:</span> {r.note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/${locale}/dawah/discussions`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {t('discussions.moderation.view')}
                </Link>
                {r.targetType === 'question' && (
                  <>
                    <ModButton onClick={() => act(r, 'hide')} busy={busyId === r.id} icon={EyeOff} tone="danger">
                      {t('discussions.moderation.hide')}
                    </ModButton>
                    <ModButton onClick={() => act(r, 'restore')} busy={busyId === r.id} icon={RotateCcw} tone="ok">
                      {t('discussions.moderation.restore')}
                    </ModButton>
                    <ModButton onClick={() => act(r, 'lock')} busy={busyId === r.id} icon={Lock} tone="muted">
                      {t('discussions.moderation.lock')}
                    </ModButton>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Category answer-policy editor. Co-located with the report queue because both are the
 * moderator's job (DISCUSSIONS_MODERATE). Flipping a policy is NOT retroactive — the copy
 * says so, because a moderator who assumes otherwise would think they had hidden live
 * answers when they had not.
 */
function PolicyPanel() {
  const t = useTranslations('dawah');
  const { success, error } = useToast();
  const [cats, setCats] = useState<CategoryPolicy[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    dawahApi.admin.discussions.categoryPolicies().then(setCats).catch(() => setCats([]));
  }, []);

  const toggle = async (c: CategoryPolicy) => {
    const next = c.answerPolicy === 'open' ? 'scholar_review' : 'open';
    setBusyId(c.id);
    try {
      await dawahApi.admin.discussions.setPolicy(c.id, next);
      setCats((prev) => prev.map((x) => (x.id === c.id ? { ...x, answerPolicy: next } : x)));
      success(t('discussions.policy.saved'));
    } catch {
      error(t('discussions.policy.saveError'));
    } finally {
      setBusyId(null);
    }
  };

  if (!cats.length) return null;
  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900">{t('discussions.policy.title')}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{t('discussions.policy.subtitle')}</p>
      <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
        {t('discussions.policy.notRetroactive')}
      </p>
      <ul className="mt-3 divide-y divide-gray-100">
        {cats.map((c) => {
          const reviewed = c.answerPolicy === 'scholar_review';
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-gray-700">{c.nameEn}</span>
              <button
                type="button"
                onClick={() => toggle(c)}
                disabled={busyId === c.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  reviewed
                    ? 'bg-rmc-green-light text-rmc-green'
                    : 'bg-gray-100 text-gray-500'
                }`}
                title={reviewed ? t('discussions.policy.reviewedHelp') : t('discussions.policy.openHelp')}
              >
                {reviewed ? t('discussions.policy.reviewed') : t('discussions.policy.open')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ModButton({
  onClick, busy, icon: Icon, tone, children,
}: {
  onClick: () => void;
  busy: boolean;
  icon: typeof Eye;
  tone: 'danger' | 'ok' | 'muted';
  children: React.ReactNode;
}) {
  const tones = {
    danger: 'text-red-600 hover:bg-red-50 border-red-200',
    ok: 'text-rmc-green hover:bg-rmc-green-light border-rmc-green/30',
    muted: 'text-gray-500 hover:bg-gray-50 border-gray-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

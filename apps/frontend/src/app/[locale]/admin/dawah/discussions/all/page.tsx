'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MessagesSquare, EyeOff, RotateCcw, Lock, Trash2, ExternalLink, Loader2, Search } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { dawahApi, serverMessage, type AdminQuestion, type QuestionStatus } from '@/lib/dawahApi';

const STATUSES: QuestionStatus[] = ['published', 'hidden', 'auto_hidden', 'locked', 'deleted'];

/**
 * All questions — the answer to "a moderator spots an inappropriate question nobody
 * reported." The report queue only surfaces reported items; this lists EVERYTHING
 * (including hidden/locked), so a moderator can act on anything, not just what the crowd
 * flagged. Gated on DISCUSSIONS_MODERATE.
 */
export default function AllQuestionsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DISCUSSIONS_MODERATE]}>
      <ToastProvider>
        <AllQuestions />
      </ToastProvider>
    </ProtectedRoute>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  hidden: 'bg-gray-200 text-gray-600',
  auto_hidden: 'bg-amber-100 text-amber-700',
  locked: 'bg-slate-200 text-slate-600',
  deleted: 'bg-red-100 text-red-600',
};

function AllQuestions() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminQuestion | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dawahApi.admin.discussions.questions({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setItems(res.items);
    } catch {
      error(t('discussions.manage.loadError'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, error, t]);

  // Debounce search; refetch on filter change.
  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const act = async (q: AdminQuestion, action: 'hide' | 'restore' | 'lock' | 'delete') => {
    setBusyId(q.id);
    try {
      await dawahApi.admin.discussions.moderate(q.id, action);
      success(t('discussions.manage.acted'));
      await load();
    } catch (err) {
      error(serverMessage(err) ?? t('discussions.manage.actError'));
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t('discussions.manage.title')}</h1>
          <p className="text-sm text-gray-500">{t('discussions.manage.subtitle')}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('discussions.manage.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-200 py-2.5 pe-4 ps-9 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rmc-green"
        >
          <option value="">{t('discussions.manage.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`discussions.manage.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg skeleton" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          {t('discussions.manage.empty')}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p dir={q.language === 'ar' ? 'rtl' : 'ltr'} className="truncate text-sm font-medium text-gray-900">
                  {q.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {q.isAnonymous ? <em>{t('discussions.manage.anonymous')}</em> : q.author}
                  {q.category && <> · {q.category.nameEn}</>}
                  {' · '}{t('discussions.manage.answers', { count: q.answerCount })}
                  {q.reportCount > 0 && <> · <span className="text-amber-600">{t('discussions.manage.reports', { count: q.reportCount })}</span></>}
                </p>
              </div>

              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[q.status] ?? ''}`}>
                {t(`discussions.manage.status.${q.status}`)}
              </span>

              <div className="flex items-center gap-1">
                <IconBtn href={`/${locale}/dawah/discussions/${q.slug}`} icon={ExternalLink} label={t('discussions.manage.view')} />
                {q.status === 'published' && (
                  <>
                    <IconBtn onClick={() => act(q, 'hide')} busy={busyId === q.id} icon={EyeOff} label={t('discussions.manage.hide')} tone="warn" />
                    <IconBtn onClick={() => act(q, 'lock')} busy={busyId === q.id} icon={Lock} label={t('discussions.manage.lock')} />
                  </>
                )}
                {(q.status === 'hidden' || q.status === 'auto_hidden' || q.status === 'locked' || q.status === 'deleted') && (
                  <IconBtn onClick={() => act(q, 'restore')} busy={busyId === q.id} icon={RotateCcw} label={t('discussions.manage.restore')} tone="ok" />
                )}
                {q.status !== 'deleted' && (
                  <IconBtn onClick={() => setConfirmDelete(q)} busy={busyId === q.id} icon={Trash2} label={t('discussions.manage.delete')} tone="danger" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title={t('discussions.manage.delete')}
        message={t('discussions.manage.deleteConfirm')}
        confirmLabel={t('discussions.manage.delete')}
        variant="danger"
        onConfirm={() => { if (confirmDelete) void act(confirmDelete, 'delete'); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function IconBtn({
  href, onClick, busy, icon: Icon, label, tone,
}: {
  href?: string; onClick?: () => void; busy?: boolean;
  icon: typeof EyeOff; label: string; tone?: 'ok' | 'warn' | 'danger';
}) {
  const tones = {
    ok: 'text-rmc-green hover:bg-rmc-green-light',
    warn: 'text-amber-600 hover:bg-amber-50',
    danger: 'text-red-600 hover:bg-red-50',
    undefined: 'text-gray-400 hover:bg-gray-100',
  } as Record<string, string>;
  const cls = `inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tones[tone ?? 'undefined']}`;
  const content = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />;
  if (href) return <Link href={href} title={label} className={cls}>{content}</Link>;
  return <button type="button" onClick={onClick} disabled={busy} title={label} aria-label={label} className={cls}>{content}</button>;
}

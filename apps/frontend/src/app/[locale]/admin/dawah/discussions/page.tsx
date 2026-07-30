'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ExternalLink, EyeOff, Loader2, Pencil, Plus, RotateCcw, Search, Trash2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { EntryEditor } from '@/components/dawah/EntryEditor';
import {
  dawahApi, serverMessage,
  type AdminQuestion, type QuestionStatus,
} from '@/lib/dawahApi';

const STATUSES: (QuestionStatus | '')[] = ['', 'published', 'pending', 'rejected', 'hidden'];

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-gray-100 text-gray-500',
  hidden: 'bg-orange-100 text-orange-700',
  deleted: 'bg-red-100 text-red-700',
};

/**
 * The Q&A library — every entry, in every status.
 *
 * Gated on DISCUSSIONS_VERIFY: the authority to speak for RMC on a point of religion. That
 * permission used to mean "bless a member's answer"; it now means "write the answer", which
 * is the same authority pointed at the thing that actually reaches a reader. A content
 * admin who uploads PDFs still has no business here.
 *
 * Withdrawing a published entry is a DIFFERENT permission (DISCUSSIONS_MODERATE), enforced
 * by the backend — RMC may put authoring and withdrawal in different hands.
 */
export default function AdminDiscussionsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DISCUSSIONS_VERIFY]}>
      <ToastProvider>
        <EntryLibrary />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function EntryLibrary() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('dawah');
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<QuestionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  /** null = closed; '' = composing a new entry; an id = editing that one. */
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminQuestion | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await dawahApi.admin.discussions.entries({
        status: status || undefined,
        search: search || undefined,
        limit: 50,
      });
      setItems(page.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  // One request per pause, not per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const act = async (entry: AdminQuestion, action: 'hide' | 'restore' | 'delete') => {
    setBusyId(entry.id);
    try {
      await dawahApi.admin.discussions.moderate(entry.id, action);
      success(t('discussions.admin.acted'));
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toastError(serverMessage(err) ?? t('discussions.admin.actError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t('discussions.admin.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('discussions.admin.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/dawah/discussions/submissions`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-rmc-green hover:text-rmc-green"
          >
            {t('discussions.admin.submissionsLink')}
          </Link>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('')}>
            {t('discussions.admin.newEntry')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('discussions.admin.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-rmc-green"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
          {STATUSES.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                status === s ? 'bg-rmc-green text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t(`discussions.admin.status.${s || 'all'}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-rmc-green" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          {t('discussions.admin.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      STATUS_STYLE[entry.status] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {t(`discussions.admin.status.${entry.status}`)}
                  </span>
                  {entry.category && (
                    <span className="text-[11px] text-gray-400">{entry.category.nameEn}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium text-gray-900">{entry.title}</p>
                {entry.answeredBy && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {t('discussions.admin.answeredBy', { name: entry.answeredBy })}
                  </p>
                )}
              </div>

              {entry.status === 'published' && (
                <Link
                  href={`/${locale}/dawah/discussions/${entry.slug}`}
                  target="_blank"
                  className="text-gray-400 transition-colors hover:text-rmc-green"
                  aria-label={t('discussions.admin.view')}
                  title={t('discussions.admin.view')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}

              <Button
                size="xs"
                variant="outline"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => setEditing(entry.id)}
              >
                {t('discussions.admin.edit')}
              </Button>

              {entry.status === 'published' ? (
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={busyId === entry.id}
                  leftIcon={<EyeOff className="h-3.5 w-3.5" />}
                  onClick={() => act(entry, 'hide')}
                >
                  {t('discussions.admin.hide')}
                </Button>
              ) : entry.status === 'hidden' ? (
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={busyId === entry.id}
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => act(entry, 'restore')}
                >
                  {t('discussions.admin.restore')}
                </Button>
              ) : null}

              <button
                type="button"
                onClick={() => setConfirmDelete(entry)}
                className="text-gray-400 transition-colors hover:text-red-600"
                aria-label={t('discussions.admin.delete')}
                title={t('discussions.admin.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <EntryEditor
          entryId={editing || null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await act(confirmDelete, 'delete');
        }}
        title={t('discussions.admin.deleteConfirmTitle')}
        message={t('discussions.admin.deleteConfirmBody')}
        confirmLabel={t('discussions.admin.delete')}
        variant="danger"
        isLoading={busyId === confirmDelete?.id}
      />
    </div>
  );
}

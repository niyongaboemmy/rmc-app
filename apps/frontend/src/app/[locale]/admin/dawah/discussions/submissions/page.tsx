'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Clock, Loader2, Send, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { localized } from '@/components/dawah/localize';
import {
  dawahApi, serverMessage,
  type DawahCategory, type PendingSubmission,
} from '@/lib/dawahApi';

/** Past this, a queue is not being worked. Mirrors the old scholar-queue alarm. */
const STALE_HOURS = 72;

/**
 * Member questions waiting for RMC to answer them.
 *
 * This is the queue the whole model turns on: nothing a member submits is public until
 * somebody here answers it. An unworked queue is therefore not a backlog of noise, it is a
 * set of people waiting — which is why each card carries its age and anything past three
 * days is called out.
 */
export default function AdminSubmissionsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DISCUSSIONS_VERIFY]}>
      <ToastProvider>
        <SubmissionQueue />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function SubmissionQueue() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('dawah');
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Which submission is being answered, and the draft for it. */
  const [answering, setAnswering] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [confirmReject, setConfirmReject] = useState<PendingSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await dawahApi.admin.discussions.submissions());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, [load]);

  const openAnswer = (s: PendingSubmission) => {
    setAnswering(s.id);
    setDraft('');
    setDraftCategory(s.category?.id ?? '');
  };

  const publish = async (s: PendingSubmission) => {
    setBusyId(s.id);
    try {
      await dawahApi.admin.discussions.answer(s.id, {
        answerBody: draft,
        categoryId: draftCategory || undefined,
      });
      success(t('discussions.admin.published'));
      setAnswering(null);
      await load();
    } catch (err) {
      toastError(serverMessage(err) ?? t('discussions.admin.saveError'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (s: PendingSubmission) => {
    setBusyId(s.id);
    try {
      await dawahApi.admin.discussions.reject(s.id, rejectReason);
      success(t('discussions.admin.rejected'));
      setConfirmReject(null);
      setRejectReason('');
      await load();
    } catch (err) {
      toastError(serverMessage(err) ?? t('discussions.admin.actError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <Link
          href={`/${locale}/admin/dawah/discussions`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('discussions.admin.backToLibrary')}
        </Link>
        <h1 className="mt-3 text-lg font-bold text-gray-900">
          {t('discussions.admin.submissionsTitle')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('discussions.admin.submissionsSubtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-rmc-green" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          {t('discussions.admin.queueEmpty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    dir={s.language === 'ar' ? 'rtl' : 'ltr'}
                    className="text-sm font-bold text-gray-900"
                  >
                    {s.title}
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {s.author && t('discussions.admin.askedBy', { name: s.author })}
                    {s.category && ` · ${s.category.nameEn}`}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    s.ageHours >= STALE_HOURS
                      ? 'bg-red-50 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {t('discussions.admin.waitingHours', { hours: s.ageHours })}
                </span>
              </div>

              {/* The question, rendered + sanitised by the API. */}
              <div
                dir={s.language === 'ar' ? 'rtl' : 'ltr'}
                className="prose prose-sm mt-3 max-w-none rounded-lg bg-gray-50 p-3 text-gray-600 prose-a:text-rmc-green"
                dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
              />

              {answering === s.id ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('discussions.admin.answerLabel')}
                    </label>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      dir={s.language === 'ar' ? 'rtl' : 'ltr'}
                      rows={7}
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-[13px] outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green"
                      placeholder={t('discussions.admin.answerPlaceholder')}
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      {t('discussions.admin.markdownHint')}
                    </p>
                  </div>

                  {/* Answering is usually the moment it becomes clear what the question
                      actually was, so the category is settable here. */}
                  <div className="max-w-xs">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('discussions.ask.categoryLabel')}
                    </label>
                    <SearchableSelect
                      value={draftCategory}
                      onChange={setDraftCategory}
                      options={[
                        { value: '', label: t('discussions.ask.noCategory') },
                        ...categories.map((c) => ({
                          value: c.id,
                          label: localized(c, 'name', locale),
                        })),
                      ]}
                      size="md"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      isLoading={busyId === s.id}
                      disabled={draft.trim().length < 20}
                      leftIcon={<Send className="h-4 w-4" />}
                      onClick={() => publish(s)}
                    >
                      {t('discussions.admin.answerAndPublish')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAnswering(null)}>
                      {t('discussions.admin.cancel')}
                    </Button>
                    <p className="text-xs text-gray-400">{t('discussions.admin.notifyHint')}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => openAnswer(s)}>
                    {t('discussions.admin.answerIt')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<X className="h-4 w-4" />}
                    onClick={() => setConfirmReject(s)}
                  >
                    {t('discussions.admin.reject')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={confirmReject !== null}
        onClose={() => {
          setConfirmReject(null);
          setRejectReason('');
        }}
        onConfirm={async () => {
          if (confirmReject) await reject(confirmReject);
        }}
        title={t('discussions.admin.rejectConfirmTitle')}
        message={t('discussions.admin.rejectConfirmBody')}
        confirmLabel={t('discussions.admin.reject')}
        variant="danger"
        isLoading={busyId === confirmReject?.id}
      />
    </div>
  );
}

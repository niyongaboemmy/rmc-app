'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Library, Plus, Pencil, Trash2, RefreshCw, Search, Eye, EyeOff,
  ListTree, BookOpen, ImageOff, Check, AlertTriangle,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import { ConfirmModal } from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { StatusBadge } from '@/components/ui/Badge';
import { CourseModal, LEVELS, STATUSES, htmlEmpty, type Lang } from '@/components/dawah/CourseModal';
import {
  dawahApi,
  type DawahCourse, type DawahCategory, type ContentStatus,
} from '@/lib/dawahApi';

export default function AdminDawahCoursesPage() {
  return (
    <ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>
      <ToastProvider>
        <CoursesAdmin />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function CoursesAdmin() {
  const t = useTranslations('admin.dawah');
  const td = useTranslations('dawah.courses'); // shared level/format/language labels
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);

  const [courses, setCourses] = useState<DawahCourse[]>([]);
  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; course: DawahCourse | null }>({ open: false, course: null });
  const [deleting, setDeleting] = useState<DawahCourse | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const [page, cats] = await Promise.all([
        dawahApi.admin.courses.list({ limit: 100 }),
        dawahApi.admin.categories.list(),
      ]);
      setCourses(page.items);
      setCategories(cats);
    } catch {
      setCourses([]);
      error(t('courses.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, error]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      courses.filter((c) => {
        if (categoryFilter && c.categoryId !== categoryFilter) return false;
        if (levelFilter && c.level !== levelFilter) return false;
        if (statusFilter && c.status !== statusFilter) return false;
        if (q) {
          return (
            c.titleEn.toLowerCase().includes(q) ||
            c.titleRw.toLowerCase().includes(q) ||
            c.titleAr.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [courses, q, categoryFilter, levelFilter, statusFilter],
  );

  const categoryName = (c: DawahCourse) =>
    c.category ? localized(c.category, 'name', locale) : '';

  const toggleStatus = async (course: DawahCourse) => {
    const next: ContentStatus = course.status === 'published' ? 'draft' : 'published';
    setStatusBusyId(course.id);
    try {
      await dawahApi.admin.courses.setStatus(course.id, next);
      success(next === 'published' ? t('courses.published') : t('courses.unpublished'));
      fetchCourses();
    } catch {
      error(t('courses.statusError'));
    } finally {
      setStatusBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.courses.remove(deleting.id);
      success(t('courses.deleted'));
      setDeleting(null);
      fetchCourses();
    } catch {
      error(t('courses.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10">
            <Library className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{t('courses.title')}</h1>
            <p className="text-sm text-gray-500">{t('courses.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCourses}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className="h-4 w-4" /> {t('courses.refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setModal({ open: true, course: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <Plus className="h-4 w-4" /> {t('courses.new')}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('readOnly')}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('courses.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 py-2.5 ps-9 pe-4 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30"
          />
        </div>
        <SearchableSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: '', label: t('courses.allCategories') },
            ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) })),
          ]}
          className="w-full sm:w-52"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
        <SearchableSelect
          value={levelFilter}
          onChange={setLevelFilter}
          options={[
            { value: '', label: t('courses.allLevels') },
            ...LEVELS.map((l) => ({ value: l, label: td(`level.${l}`) })),
          ]}
          className="w-full sm:w-44"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
        <SearchableSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: t('courses.allStatuses') },
            ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
          ]}
          className="w-full sm:w-44"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('courses.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-start">
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('courses.col.cover')}</th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('courses.col.title')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 md:table-cell">{t('courses.col.category')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 lg:table-cell">{t('courses.col.level')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 lg:table-cell">{t('courses.col.lessons')}</th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('courses.col.status')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 xl:table-cell">{t('courses.col.updated')}</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((c) => (
                  <tr key={c.id} className="align-top transition-colors hover:bg-rmc-green/[0.03]">
                    <td className="px-4 py-3.5">
                      <div className="h-10 w-14 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {c.coverImageKey ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(c.coverImageKey)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{localized(c, 'title', locale) || c.slug}</p>
                      <p className="text-xs text-gray-400">/{c.slug}</p>
                      <TranslationChips
                        className="mt-1"
                        en={!!(c.titleEn && c.summaryEn && !htmlEmpty(c.descriptionEn))}
                        rw={!!(c.titleRw && c.summaryRw && !htmlEmpty(c.descriptionRw))}
                        ar={!!(c.titleAr && c.summaryAr && !htmlEmpty(c.descriptionAr))}
                      />
                    </td>
                    <td className="hidden px-4 py-3.5 text-gray-600 md:table-cell">
                      {categoryName(c) || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-gray-600 lg:table-cell">{td(`level.${c.level}`)}</td>
                    <td className="hidden px-4 py-3.5 text-gray-600 lg:table-cell">{c.lessonCount}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t(`status.${c.status}`)} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-gray-400 xl:table-cell">
                      {new Date(c.updatedAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/${locale}/admin/dawah/courses/${c.id}/lessons`}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                          aria-label={t('courses.manageLessons')}
                          title={t('courses.manageLessons')}
                        >
                          <ListTree className="h-4 w-4" />
                        </Link>
                        {canManage && (
                          <>
                            <button
                              onClick={() => toggleStatus(c)}
                              disabled={statusBusyId === c.id}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green disabled:opacity-50"
                              aria-label={c.status === 'published' ? t('actions.unpublish') : t('actions.publish')}
                              title={c.status === 'published' ? t('actions.unpublish') : t('actions.publish')}
                            >
                              {c.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setModal({ open: true, course: c })}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                              aria-label={t('actions.edit')}
                              title={t('actions.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(c)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={t('actions.delete')}
                              title={t('actions.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && canManage && (
        <CourseModal
          course={modal.course}
          categories={categories}
          onClose={() => setModal({ open: false, course: null })}
          onSaved={() => { setModal({ open: false, course: null }); fetchCourses(); }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        onConfirm={confirmDelete}
        title={t('actions.delete')}
        message={t('courses.confirmDelete')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        isLoading={deleteBusy}
      />
    </div>
  );
}

/** Compact EN / RW / AR completeness chips. Green = filled, amber = missing. */
function TranslationChips({ en, rw, ar, className }: { en: boolean; rw: boolean; ar: boolean; className?: string }) {
  const chips: [Lang, boolean][] = [['en', en], ['rw', rw], ['ar', ar]];
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {chips.map(([lang, ok]) => (
        <span
          key={lang}
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold uppercase',
            ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {ok ? <Check className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
          {lang}
        </span>
      ))}
    </div>
  );
}

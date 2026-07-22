'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmModal } from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { EditModeProvider, useEditMode } from '@/contexts/EditModeContext';
import { EditableText } from '@/components/cms/EditableText';
import { EditToolbar } from '@/components/cms/EditToolbar';
import { ContentKeys, COURSES_DEFAULT } from '@/lib/content-api';
import { CourseCard } from './CourseCard';
import { CourseModal, LEVELS } from './CourseModal';
import { localized } from './localize';
import {
  dawahApi,
  type CourseLevel,
  type CourseLanguage,
  type DawahCategory,
  type DawahCourse,
  type Paginated,
} from '@/lib/dawahApi';

const LANGUAGES: CourseLanguage[] = ['en', 'rw', 'ar', 'multi'];
const PAGE_SIZE = 12;

/**
 * The course catalogue.
 *
 * Filtering is SERVER-SIDE. The admin/schools page can get away with a
 * client-side useMemo because it loads every school in one request; this list
 * is paginated, so a client-side filter would only ever search the twelve rows
 * that happen to be on the current page and would silently lie about the rest.
 * Every filter goes to the API as a query param.
 *
 * The URL is the single source of truth for filter state, so a filtered view is
 * shareable, survives a refresh, and works with the back button. Component
 * state exists only for the search box (which needs to feel instant while its
 * commit to the URL is debounced) and for the fetched page itself.
 *
 * For admins the page doubles as its own CMS — the exact mirror of the Library
 * page. `EditModeProvider` wraps the view so the header/empty/error prose becomes
 * editable in place (persisted to the `courses` content section), and — for a
 * `dawah:manage` holder — each card grows edit/delete controls plus an "add
 * course" tile that open the very same `CourseModal` the admin dashboard uses.
 * Everyone else sees exactly the page they always did; the toolbar and controls
 * never render without the permission.
 */
export function CoursesPageClient() {
  const { hasPermission } = useAuth();
  const canEditCopy = hasPermission(Permission.CONTENT_EDIT);
  const canManageCourses = hasPermission(Permission.DAWAH_MANAGE);

  return (
    <ToastProvider>
      <EditModeProvider
        sectionKey={ContentKeys.courses}
        defaults={COURSES_DEFAULT}
        canEdit={canEditCopy || canManageCourses}
        canSave={canEditCopy}
      >
        <CoursesView canManageCourses={canManageCourses} />
        <EditToolbar />
      </EditModeProvider>
    </ToastProvider>
  );
}

function CoursesView({ canManageCourses }: { canManageCourses: boolean }) {
  const t = useTranslations('dawah');
  const ta = useTranslations('admin.dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { editing } = useEditMode();
  const { success, error: toastError } = useToast();

  const manage = editing && canManageCourses;

  const category = searchParams.get('category') ?? '';
  const level = searchParams.get('level') ?? '';
  const language = searchParams.get('language') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [data, setData] = useState<Paginated<DawahCourse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Course management (edit mode only). `refreshKey` re-runs the list fetch after
  // a create/edit/delete without disturbing the URL-driven filter state.
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingCourse, setEditingCourse] = useState<DawahCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<DawahCourse | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  // Typed-but-not-yet-committed search text. Mirrors the URL when the URL
  // changes underneath us (back button, a shared link, Clear filters).
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  /** Write filters to the URL. A filter change always resets to page 1 — page 3
   *  of the old result set is meaningless against a new one. */
  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '' ) params.delete(key);
        else params.set(key, String(value));
      }
      const qs = params.toString();
      // replace, not push: twenty keystrokes should not be twenty back-button steps.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounce the search box ~300ms — one request per pause, not per keystroke.
  useEffect(() => {
    if (searchInput === search) return;
    const id = setTimeout(() => setParams({ search: searchInput || null, page: null }), 300);
    return () => clearTimeout(id);
  }, [searchInput, search, setParams]);

  useEffect(() => {
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Refetch whenever any filter or the page changes — i.e. whenever the URL does.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dawahApi.courses
      .list({
        category: category || undefined,
        level: (level as CourseLevel) || undefined,
        language: (language as CourseLanguage) || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        // A slow response for filters the user has already moved on from must
        // not overwrite the current one.
        if (cancelled) return;
        setData(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, level, language, search, page, refreshKey]);

  const reloadCourses = useCallback(() => setRefreshKey((k) => k + 1), []);

  // The public listing may strip the rich `description` for payload size; fetch
  // the admin projection before opening the editor so the form has every field
  // it needs to re-save (mirrors the Library's book editor).
  const openEdit = useCallback(
    async (course: DawahCourse) => {
      setBusyCourseId(course.id);
      try {
        const full = await dawahApi.admin.courses.get(course.id);
        setEditingCourse(full);
      } catch {
        toastError(ta('courses.loadError'));
      } finally {
        setBusyCourseId(null);
      }
    },
    [ta, toastError],
  );

  const confirmDelete = useCallback(async () => {
    if (!deletingCourse) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.courses.remove(deletingCourse.id);
      success(ta('courses.deleted'));
      setDeletingCourse(null);
      reloadCourses();
    } catch {
      toastError(ta('courses.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  }, [deletingCourse, ta, success, toastError, reloadCourses]);

  const hasFilters = Boolean(category || level || language || search);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions = [
    { value: '', label: t('courses.allCategories') },
    ...categories.map((c) => ({ value: c.slug, label: localized(c, 'name', locale) })),
  ];
  const levelOptions = [
    { value: '', label: t('courses.allLevels') },
    ...LEVELS.map((l) => ({ value: l, label: t(`courses.level.${l}`) })),
  ];
  const languageOptions = [
    { value: '', label: t('courses.allLanguages') },
    ...LANGUAGES.map((l) => ({ value: l, label: t(`courses.language.${l}`) })),
  ];

  return (
    <div className="min-h-screen">
      {/* Solid navbar: with the image hero gone, a transparent bar would put
          white links on the light section below and read as invisible. */}
      <Navbar solid />
      <main>
        <section className="relative bg-gray-50/60 pb-10 pt-24 md:pb-14 md:pt-28">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Compact header — back link + title + subtitle. Replaces the
                image hero; pt clears the fixed navbar. Kept in step with the
                Library listing — change both or neither. ── */}
            <div className="mb-6">
              <Link
                href={`/${locale}/dawah`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t('backToDawah')}
              </Link>
              <EditableText
                as="h1"
                path="header.title"
                placeholder={t('courses.title')}
                className="mt-4 block text-2xl font-bold text-rmc-green-deep md:text-3xl"
              />
              <EditableText
                as="p"
                path="header.subtitle"
                multiline
                placeholder={t('courses.subtitle')}
                className="mt-1.5 block text-sm text-gray-500 md:text-base"
              />
            </div>

            {/* ── Filter bar ─────────────────────────────────────────────── */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative">
                    {/* start-3 + ps-9, not left-3/pl-9 — the icon has to swap
                        sides in Arabic or it sits on top of the text. */}
                    <Search
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('courses.searchPlaceholder')}
                      aria-label={t('courses.searchPlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green"
                    />
                  </div>

                  <SearchableSelect
                    value={category}
                    onChange={(v) => setParams({ category: v || null, page: null })}
                    options={categoryOptions}
                    placeholder={t('courses.allCategories')}
                    size="md"
                    zIndex={40}
                  />
                  <SearchableSelect
                    value={level}
                    onChange={(v) => setParams({ level: v || null, page: null })}
                    options={levelOptions}
                    placeholder={t('courses.allLevels')}
                    size="md"
                    zIndex={40}
                  />
                  <SearchableSelect
                    value={language}
                    onChange={(v) => setParams({ language: v || null, page: null })}
                    options={languageOptions}
                    placeholder={t('courses.allLanguages')}
                    size="md"
                    zIndex={40}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">
                    {loading ? t('courses.loading') : t('courses.resultCount', { count: total })}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() =>
                        setParams({ category: null, level: null, language: null, search: null, page: null })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('courses.clearFilters')}
                    </button>
                  )}
                </div>
              </div>
            </Reveal>

            {/* ── Results ────────────────────────────────────────────────── */}
            {failed ? (
              <ErrorState retry={t('courses.error.retry')} onRetry={() => router.refresh()} />
            ) : loading && !data ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[26rem] rounded-[1.75rem] skeleton" />
                ))}
              </div>
            ) : total === 0 && !manage ? (
              <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rmc-green-light text-rmc-green">
                  <BookOpen className="h-6 w-6" aria-hidden />
                </span>
                {/* `empty` (with its "clear your filters" advice) is the right copy
                    HERE — this page has filters. The landing page uses
                    `outlineEmpty` instead, because it has none. */}
                <EditableText
                  as="p"
                  path="empty.title"
                  placeholder={t('courses.empty.title')}
                  className="mt-4 block font-semibold text-gray-900"
                />
                <EditableText
                  as="p"
                  path="empty.body"
                  multiline
                  placeholder={t('courses.empty.body')}
                  className="mt-1.5 block text-sm text-gray-500"
                />
              </div>
            ) : (
              <>
                <div
                  className={`mt-8 grid gap-4 lg:grid-cols-2 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {manage && (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="flex min-h-[9rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white/60 text-gray-400 transition-colors hover:border-rmc-green/50 hover:text-rmc-green"
                    >
                      <Plus className="h-6 w-6" aria-hidden />
                      <span className="px-2 text-center text-xs font-semibold">{ta('courses.new')}</span>
                    </button>
                  )}
                  {data?.items.map((course) => (
                    <div key={course.id} className="relative">
                      <CourseCard course={course} locale={locale} />
                      {manage && (
                        <div className="absolute end-2 top-2 z-10 flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(course)}
                            disabled={busyCourseId === course.id}
                            aria-label={ta('actions.edit')}
                            title={ta('actions.edit')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-rmc-green disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCourse(course)}
                            aria-label={ta('actions.delete')}
                            title={ta('actions.delete')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {total === 0 && manage && (
                  <p className="mt-8 text-center text-sm text-gray-400">{t('courses.empty.title')}</p>
                )}

                {pages > 1 && (
                  <nav
                    className="mt-10 flex items-center justify-between gap-4"
                    aria-label={t('courses.title')}
                  >
                    <p className="text-sm text-gray-500">
                      {t('pagination.page', { page, pages })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setParams({ page: page - 1 })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                      >
                        {/* The chevrons are direction, not decoration — they flip. */}
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                        {t('pagination.previous')}
                      </button>
                      <button
                        type="button"
                        disabled={page >= pages}
                        onClick={() => setParams({ page: page + 1 })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                      >
                        {t('pagination.next')}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {(creating || editingCourse) && (
        <CourseModal
          course={editingCourse}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditingCourse(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditingCourse(null);
            reloadCourses();
          }}
        />
      )}

      <ConfirmModal
        open={!!deletingCourse}
        onClose={() => (deleteBusy ? undefined : setDeletingCourse(null))}
        onConfirm={confirmDelete}
        title={ta('actions.delete')}
        message={ta('courses.confirmDelete')}
        confirmLabel={ta('actions.delete')}
        cancelLabel={ta('actions.cancel')}
        variant="danger"
        isLoading={deleteBusy}
        className="rounded-lg"
      />
    </div>
  );
}

function ErrorState({ retry, onRetry }: { retry: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-red-200 bg-white p-10 text-center">
      <EditableText
        as="p"
        path="error.title"
        className="block font-semibold text-gray-900"
      />
      <EditableText
        as="p"
        path="error.body"
        multiline
        className="mt-1.5 block text-sm text-gray-500"
      />
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
      >
        {retry}
      </button>
    </div>
  );
}

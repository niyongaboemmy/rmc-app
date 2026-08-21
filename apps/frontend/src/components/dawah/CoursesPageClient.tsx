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
import { useToast } from '@/components/ui/Toast';
import { Permission } from '@/lib/permissions';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { ContentKeys, COURSES_DEFAULT, pick, type CoursesContent, type Locale } from '@/lib/content-api';
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
 * The course catalogue. Filtering is SERVER-SIDE and the URL is the single source
 * of truth (a filtered view is shareable and survives the back button).
 *
 * The page doubles as its own CMS via the site-wide in-context Edit Mode
 * (`lib/edit-mode`): `useEditableContent` makes the header/empty/error prose
 * editable (content:edit, published with the global batch), and — for a
 * `dawah:manage` holder in edit mode — each card grows edit/delete controls plus
 * an "add course" tile opening the same `CourseModal` the admin dashboard uses.
 * Course CRUD saves immediately via `dawahApi`. Everyone else sees the page they
 * always did.
 */
export function CoursesPageClient() {
  const t = useTranslations('dawah');
  const ta = useTranslations('admin.dawah');
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const { content, setField } = useEditableContent<CoursesContent>(ContentKeys.courses, COURSES_DEFAULT);
  const { editMode, hasPermission } = useEditMode();
  const manage = editMode && hasPermission(Permission.DAWAH_MANAGE);

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

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, String(value));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (searchInput === search) return;
    const id = setTimeout(() => setParams({ search: searchInput || null, page: null }), 300);
    return () => clearTimeout(id);
  }, [searchInput, search, setParams]);

  useEffect(() => {
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

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

  // The public listing may strip the rich `description`; fetch the admin
  // projection before opening the editor so the form can re-save every field.
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
      <Navbar solid />
      <main>
        <section className="relative bg-gray-50/60 pb-10 pt-24 md:pb-14 md:pt-28">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Compact header — back link + title + subtitle. ── */}
            <div className="mb-6">
              <Link
                href={`/${locale}/dawah`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t('backToDawah')}
              </Link>
              <InlineText
                as="h1"
                lang={locale}
                value={pick(content.header.title, locale) || t('courses.title')}
                onCommit={(v) => setField((d) => { d.header.title[lang] = v; })}
                placeholder={t('courses.title')}
                className="mt-4 block text-2xl font-bold text-rmc-green-deep md:text-3xl"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.header.subtitle, locale) || t('courses.subtitle')}
                onCommit={(v) => setField((d) => { d.header.subtitle[lang] = v; })}
                placeholder={t('courses.subtitle')}
                className="mt-1.5 block text-sm text-gray-500 md:text-base"
              />
            </div>

            {/* ── Filter bar ─────────────────────────────────────────────── */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative">
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
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
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
              <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-red-200 bg-white p-10 text-center">
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.error.title, locale)}
                  onCommit={(v) => setField((d) => { d.error.title[lang] = v; })}
                  className="block font-semibold text-gray-900"
                />
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.error.body, locale)}
                  onCommit={(v) => setField((d) => { d.error.body[lang] = v; })}
                  className="mt-1.5 block text-sm text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="mt-4 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                >
                  {t('courses.error.retry')}
                </button>
              </div>
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
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.empty.title, locale)}
                  onCommit={(v) => setField((d) => { d.empty.title[lang] = v; })}
                  placeholder={t('courses.empty.title')}
                  className="mt-4 block font-semibold text-gray-900"
                />
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.empty.body, locale)}
                  onCommit={(v) => setField((d) => { d.empty.body[lang] = v; })}
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                      >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                        {t('pagination.previous')}
                      </button>
                      <button
                        type="button"
                        disabled={page >= pages}
                        onClick={() => setParams({ page: page + 1 })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Library as LibraryIcon, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react';
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
import { ContentKeys, LIBRARY_DEFAULT } from '@/lib/content-api';
import { BookCard } from './BookCard';
import { BookModal } from './BookModal';
import { BookPreviewOverlay } from './BookPreviewOverlay';
import { localized } from './localize';
import {
  dawahApi,
  type BookLanguage,
  type DawahBook,
  type DawahBookAdmin,
  type DawahCategory,
  type Paginated,
} from '@/lib/dawahApi';

const LANGUAGES: BookLanguage[] = ['en', 'rw', 'ar', 'other'];
const PAGE_SIZE = 12;

/**
 * The digital library. Same filtering discipline as CoursesPageClient — the URL
 * is the single source of truth, filtering is SERVER-SIDE (the list is
 * paginated, so a client-side filter would silently lie about every page but the
 * current one), and the search box is debounced.
 *
 * The primary interaction is "click a card → full-screen preview overlay". The
 * selected book lives in component state; the overlay's shareable/indexable
 * twin is the /library/[slug] route the cards also point at.
 *
 * For admins the page doubles as its own CMS: `EditModeProvider` wraps the view
 * so the header/empty/error prose becomes editable in place (persisted to the
 * `library` content section), and — for a `dawah:manage` holder — each card
 * grows edit/delete controls plus an "add book" tile that open the very same
 * `BookModal` the admin dashboard uses. Everyone else sees exactly the page they
 * always did; the toolbar and controls never render without the permission.
 */
export function LibraryPageClient() {
  const { hasPermission } = useAuth();
  const canEditCopy = hasPermission(Permission.CONTENT_EDIT);
  const canManageBooks = hasPermission(Permission.DAWAH_MANAGE);

  return (
    <ToastProvider>
      <EditModeProvider
        sectionKey={ContentKeys.library}
        defaults={LIBRARY_DEFAULT}
        canEdit={canEditCopy || canManageBooks}
        canSave={canEditCopy}
      >
        <LibraryView canManageBooks={canManageBooks} />
        <EditToolbar />
      </EditModeProvider>
    </ToastProvider>
  );
}

function LibraryView({ canManageBooks }: { canManageBooks: boolean }) {
  const t = useTranslations('dawah');
  const ta = useTranslations('admin.dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { editing } = useEditMode();
  const { success, error: toastError } = useToast();

  const manage = editing && canManageBooks;

  const category = searchParams.get('category') ?? '';
  const language = searchParams.get('language') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [data, setData] = useState<Paginated<DawahBook> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<DawahBook | null>(null);

  // Book management (edit mode only). `refreshKey` re-runs the list fetch after
  // a create/edit/delete without disturbing the URL-driven filter state.
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingBook, setEditingBook] = useState<DawahBookAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingBook, setDeletingBook] = useState<DawahBook | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyBookId, setBusyBookId] = useState<string | null>(null);

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
    dawahApi.books
      .list({
        category: category || undefined,
        language: (language as BookLanguage) || undefined,
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
  }, [category, language, search, page, refreshKey]);

  const reloadBooks = useCallback(() => setRefreshKey((k) => k + 1), []);

  // The public card carries no protected `fileKey`; fetch the admin projection
  // before opening the editor so the form has everything it needs to re-save.
  const openEdit = useCallback(
    async (book: DawahBook) => {
      setBusyBookId(book.id);
      try {
        const full = await dawahApi.admin.books.get(book.id);
        setEditingBook(full);
      } catch {
        toastError(ta('books.loadError'));
      } finally {
        setBusyBookId(null);
      }
    },
    [ta, toastError],
  );

  const confirmDelete = useCallback(async () => {
    if (!deletingBook) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.books.remove(deletingBook.id);
      success(ta('books.deleted'));
      setDeletingBook(null);
      reloadBooks();
    } catch {
      toastError(ta('books.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  }, [deletingBook, ta, success, toastError, reloadBooks]);

  const hasFilters = Boolean(category || language || search);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions = [
    { value: '', label: t('library.allCategories') },
    ...categories.map((c) => ({ value: c.slug, label: localized(c, 'name', locale) })),
  ];
  const languageOptions = [
    { value: '', label: t('library.allLanguages') },
    ...LANGUAGES.map((l) => ({ value: l, label: t(`library.language.${l}`) })),
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
                Courses listing — change both or neither. ── */}
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
                placeholder={t('library.title')}
                className="mt-4 block text-2xl font-bold text-rmc-green-deep md:text-3xl"
              />
              <EditableText
                as="p"
                path="header.subtitle"
                multiline
                placeholder={t('library.subtitle')}
                className="mt-1.5 block text-sm text-gray-500 md:text-base"
              />
            </div>

            {/* ── Filter bar ─────────────────────────────────────────────── */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('library.searchPlaceholder')}
                      aria-label={t('library.searchPlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green"
                    />
                  </div>

                  <SearchableSelect
                    value={category}
                    onChange={(v) => setParams({ category: v || null, page: null })}
                    options={categoryOptions}
                    placeholder={t('library.allCategories')}
                    size="md"
                    triggerClassName="rounded-lg"
                    zIndex={40}
                  />
                  <SearchableSelect
                    value={language}
                    onChange={(v) => setParams({ language: v || null, page: null })}
                    options={languageOptions}
                    placeholder={t('library.allLanguages')}
                    size="md"
                    triggerClassName="rounded-lg"
                    zIndex={40}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">
                    {loading ? t('library.loading') : t('library.resultCount', { count: total })}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => setParams({ category: null, language: null, search: null, page: null })}
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
              <ErrorState retry={t('library.error.retry')} onRetry={() => router.refresh()} />
            ) : loading && !data ? (
              <div className="mt-8 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-[1.75rem] skeleton" />
                ))}
              </div>
            ) : total === 0 && !manage ? (
              <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rmc-green-light text-rmc-green">
                  <LibraryIcon className="h-6 w-6" aria-hidden />
                </span>
                <EditableText
                  as="p"
                  path="empty.title"
                  placeholder={t('library.empty.title')}
                  className="mt-4 block font-semibold text-gray-900"
                />
                <EditableText
                  as="p"
                  path="empty.body"
                  multiline
                  placeholder={t('library.empty.body')}
                  className="mt-1.5 block text-sm text-gray-500"
                />
              </div>
            ) : (
              <>
                <div
                  className={`mt-8 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {manage && (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-e-lg rounded-s-[3px] border-2 border-dashed border-gray-300 bg-white/60 text-gray-400 transition-colors hover:border-rmc-green/50 hover:text-rmc-green"
                    >
                      <Plus className="h-6 w-6" aria-hidden />
                      <span className="px-2 text-center text-xs font-semibold">{ta('books.new')}</span>
                    </button>
                  )}
                  {data?.items.map((book) => (
                    <div key={book.id} className="relative">
                      <BookCard book={book} locale={locale} onSelect={setSelected} />
                      {manage && (
                        <div className="absolute end-1 top-1 z-10 flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(book)}
                            disabled={busyBookId === book.id}
                            aria-label={ta('actions.edit')}
                            title={ta('actions.edit')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-rmc-green disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBook(book)}
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
                  <p className="mt-8 text-center text-sm text-gray-400">{t('library.empty.title')}</p>
                )}

                {pages > 1 && (
                  <nav className="mt-10 flex items-center justify-between gap-4" aria-label={t('library.title')}>
                    <p className="text-sm text-gray-500">{t('pagination.page', { page, pages })}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setParams({ page: page - 1 })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                      >
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

      {selected && (
        <BookPreviewOverlay book={selected} locale={locale} onClose={() => setSelected(null)} />
      )}

      {(creating || editingBook) && (
        <BookModal
          book={editingBook}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditingBook(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditingBook(null);
            reloadBooks();
          }}
        />
      )}

      <ConfirmModal
        open={!!deletingBook}
        onClose={() => (deleteBusy ? undefined : setDeletingBook(null))}
        onConfirm={confirmDelete}
        title={ta('actions.delete')}
        message={ta('books.confirmDelete')}
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

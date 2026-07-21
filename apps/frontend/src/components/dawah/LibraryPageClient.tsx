'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Library as LibraryIcon, Search, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BookCard } from './BookCard';
import { BookPreviewOverlay } from './BookPreviewOverlay';
import { localized } from './localize';
import {
  dawahApi,
  type BookLanguage,
  type DawahBook,
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
 */
export function LibraryPageClient() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get('category') ?? '';
  const language = searchParams.get('language') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [data, setData] = useState<Paginated<DawahBook> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<DawahBook | null>(null);

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
  }, [category, language, search, page]);

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
              <h1 className="mt-4 text-2xl font-bold text-rmc-green-deep md:text-3xl">
                {t('library.title')}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500 md:text-base">
                {t('library.subtitle')}
              </p>
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
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                    />
                  </div>

                  <SearchableSelect
                    value={category}
                    onChange={(v) => setParams({ category: v || null, page: null })}
                    options={categoryOptions}
                    placeholder={t('library.allCategories')}
                    size="md"
                    zIndex={40}
                  />
                  <SearchableSelect
                    value={language}
                    onChange={(v) => setParams({ language: v || null, page: null })}
                    options={languageOptions}
                    placeholder={t('library.allLanguages')}
                    size="md"
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
              <ErrorState
                title={t('library.error.title')}
                body={t('library.error.body')}
                retry={t('library.error.retry')}
                onRetry={() => router.refresh()}
              />
            ) : loading && !data ? (
              <div className="mt-8 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-[1.75rem] skeleton" />
                ))}
              </div>
            ) : total === 0 ? (
              <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rmc-green-light text-rmc-green">
                  <LibraryIcon className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-4 font-semibold text-gray-900">{t('library.empty.title')}</p>
                <p className="mt-1.5 text-sm text-gray-500">{t('library.empty.body')}</p>
              </div>
            ) : (
              <>
                <div
                  className={`mt-8 grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {data!.items.map((book) => (
                    <BookCard key={book.id} book={book} locale={locale} onSelect={setSelected} />
                  ))}
                </div>

                {pages > 1 && (
                  <nav className="mt-10 flex items-center justify-between gap-4" aria-label={t('library.title')}>
                    <p className="text-sm text-gray-500">{t('pagination.page', { page, pages })}</p>
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

      {selected && (
        <BookPreviewOverlay book={selected} locale={locale} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ErrorState({
  title,
  body,
  retry,
  onRetry,
}: {
  title: string;
  body: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-red-200 bg-white p-10 text-center">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1.5 text-sm text-gray-500">{body}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
      >
        {retry}
      </button>
    </div>
  );
}

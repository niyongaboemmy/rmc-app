'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, MessagesSquare, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/hooks/useAuth';
import { DiscussionCard } from './DiscussionCard';
import { localized } from './localize';
import {
  dawahApi,
  type DawahCategory,
  type DiscussionQuestion,
  type DiscussionSort,
  type PostLanguage,
  type Paginated,
} from '@/lib/dawahApi';

const LANGUAGES: PostLanguage[] = ['en', 'rw', 'ar'];
const SORTS: DiscussionSort[] = ['active', 'new', 'unanswered'];
const PAGE_SIZE = 12;

/**
 * Community Discussions — the listing.
 *
 * Same discipline as CoursesPageClient: filtering is SERVER-SIDE and the URL is the
 * single source of truth, so a filtered view is shareable and survives the back button.
 *
 * ── The language default is a product decision, not a detail ─────────────────────────
 *
 * The filter does NOT default to the current locale. It shows everything, and lets a
 * reader narrow. Defaulting to the locale was the obvious choice and it is a trap: this
 * community is majority Kinyarwanda, the seed content is mixed, and a Kinyarwanda reader
 * who silently never sees the English and Arabic questions lands on a section that looks
 * abandoned on day one — which is how a Q&A dies before it starts. See plan §4.
 */
export function DiscussionsPageClient() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const category = searchParams.get('category') ?? '';
  const language = searchParams.get('language') ?? '';
  const sort = (searchParams.get('sort') as DiscussionSort) || 'active';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [data, setData] = useState<Paginated<DiscussionQuestion> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dawahApi.discussions
      .list({
        category: category || undefined,
        language: (language as PostLanguage) || undefined,
        sort,
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
  }, [category, language, sort, page]);

  const hasFilters = Boolean(category || language);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions = [
    { value: '', label: t('discussions.allCategories') },
    ...categories.map((c) => ({ value: c.slug, label: localized(c, 'name', locale) })),
  ];
  const languageOptions = [
    { value: '', label: t('discussions.allLanguages') },
    ...LANGUAGES.map((l) => ({ value: l, label: t(`library.language.${l}`) })),
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageHero
          eyebrow={t('title')}
          title={t('discussions.title')}
          subtitle={t('discussions.subtitle')}
          titleClassName="text-2xl md:text-3xl"
          // Matched to the Courses and Library heroes. The height comes from this
          // padding, not min-h; pt-32 is the floor because the navbar is transparent
          // over the hero and measures 114px.
          minHeightClassName="min-h-[20vh]"
          paddingClassName="pt-32 pb-10"
          backHref={`/${locale}/dawah`}
          backLabel={t('backToDawah')}
          ornament
        />

        <section className="relative bg-gray-50/60 py-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Filters ────────────────────────────────────────────────── */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <SearchableSelect
                    value={category}
                    onChange={(v) => setParams({ category: v || null, page: null })}
                    options={categoryOptions}
                    placeholder={t('discussions.allCategories')}
                    size="md"
                    zIndex={40}
                  />
                  <SearchableSelect
                    value={language}
                    onChange={(v) => setParams({ language: v || null, page: null })}
                    options={languageOptions}
                    placeholder={t('discussions.allLanguages')}
                    size="md"
                    zIndex={40}
                  />
                  {/* Sort as tabs, not a select: three options a reader switches between
                      constantly should not cost two clicks. */}
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                    {SORTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setParams({ sort: s === 'active' ? null : s, page: null })}
                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                          sort === s ? 'bg-rmc-green text-white' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {t(`discussions.sort.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">
                    {t('discussions.count', { count: total })}
                    {/* Say it plainly when the list is mixed-language — a reader seeing
                        Arabic on the English page should know it is deliberate. */}
                    {!language && (
                      <span className="ms-2 text-gray-400">· {t('discussions.otherLanguages')}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => setParams({ category: null, language: null, page: null })}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light"
                      >
                        <X className="h-3.5 w-3.5" /> {t('discussions.clearFilters')}
                      </button>
                    )}
                    {/* Ask only shows to signed-in members — the form 401s otherwise, and a
                        button that leads to a wall is a worse offer than no button. */}
                    {isAuthenticated && (
                      <Link
                        href={`/${locale}/dawah/discussions/ask`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rmc-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                      >
                        <Plus className="h-3.5 w-3.5" /> {t('discussions.askCta')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* ── The list ───────────────────────────────────────────────── */}
            {failed ? (
              <ErrorCard message={t('discussions.loadError')} />
            ) : loading && !data ? (
              <div className="mt-8 grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-lg skeleton" />
                ))}
              </div>
            ) : total === 0 ? (
              <EmptyCard
                message={hasFilters ? t('discussions.emptyFiltered') : t('discussions.empty')}
              />
            ) : (
              <>
                <div
                  className={`mt-8 grid gap-3 lg:grid-cols-2 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {data?.items.map((q) => (
                    <DiscussionCard key={q.id} question={q} locale={locale} />
                  ))}
                </div>

                {pages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setParams({ page: page - 1 })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </button>
                    <span className="text-xs text-gray-500">
                      {page} / {pages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setParams({ page: page + 1 })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/**
 * The empty state. Says what is true and nothing more.
 *
 * Deliberately NOT "be the first to ask!" — that reads as an abandoned room with a
 * cheerful sign in it. And there is no "Ask" button here in Phase A, because asking does
 * not exist yet; offering it would be a lie the reader discovers by clicking.
 */
function EmptyCard({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
        <MessagesSquare className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium text-gray-500">{message}</p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-red-200 bg-white p-10 text-center">
      <p className="font-medium text-gray-600">{message}</p>
    </div>
  );
}

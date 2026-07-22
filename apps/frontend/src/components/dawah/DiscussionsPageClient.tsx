'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, ArrowRight, EyeOff, Loader2, Lock, MessagesSquare, Plus, Search, Trash2, X,
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { ContentKeys, DISCUSSIONS_DEFAULT, pick, type DiscussionsContent, type Locale } from '@/lib/content-api';
import { DiscussionCard } from './DiscussionCard';
import { localized } from './localize';
import {
  dawahApi,
  serverMessage,
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
 * The page doubles as its own CMS via the site-wide in-context Edit Mode
 * (`lib/edit-mode`): `useEditableContent` makes the header/empty/error prose editable
 * (content:edit), and — for a `discussions:moderate` holder in edit mode — each
 * question card grows hide/lock/delete controls so it can be moderated from the public
 * listing. Everyone else sees exactly the page they always did.
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
  const lang = locale as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const { content, setField } = useEditableContent<DiscussionsContent>(ContentKeys.discussions, DISCUSSIONS_DEFAULT);
  const { editMode, hasPermission } = useEditMode();
  const moderate = editMode && hasPermission(Permission.DISCUSSIONS_MODERATE);

  const category = searchParams.get('category') ?? '';
  const language = searchParams.get('language') ?? '';
  const sort = (searchParams.get('sort') as DiscussionSort) || 'active';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  // Typed-but-not-yet-committed search text; mirrors the URL when it changes underneath
  // us (back button, Clear filters).
  const [searchInput, setSearchInput] = useState(search);
  const [data, setData] = useState<Paginated<DiscussionQuestion> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Moderation (edit mode only). `refreshKey` re-runs the fetch after an action
  // drops a question from the published list, without disturbing the URL filters.
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscussionQuestion | null>(null);

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

  useEffect(() => setSearchInput(search), [search]);

  // One request per pause, not per keystroke. Resets to page 1 — page 3 of the old
  // results is meaningless against a new query.
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
    dawahApi.discussions
      .list({
        category: category || undefined,
        language: (language as PostLanguage) || undefined,
        search: search || undefined,
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
  }, [category, language, sort, search, page, refreshKey]);

  // Moderate a question straight from the listing. hide/lock/delete all remove it
  // from the published list, so we refetch on success. Delete is confirmed first.
  const act = useCallback(
    async (q: DiscussionQuestion, action: 'hide' | 'lock' | 'delete') => {
      setBusyId(q.id);
      try {
        await dawahApi.admin.discussions.moderate(q.id, action);
        success(t('discussions.manage.acted'));
        setConfirmDelete(null);
        setRefreshKey((k) => k + 1);
      } catch (err) {
        toastError(serverMessage(err) ?? t('discussions.manage.actError'));
      } finally {
        setBusyId(null);
      }
    },
    [success, toastError, t],
  );

  const hasFilters = Boolean(category || language || search);
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
                value={pick(content.header.title, locale) || t('discussions.title')}
                onCommit={(v) => setField((d) => { d.header.title[lang] = v; })}
                placeholder={t('discussions.title')}
                className="mt-4 block text-2xl font-bold text-rmc-green-deep md:text-3xl"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.header.subtitle, locale) || t('discussions.subtitle')}
                onCommit={(v) => setField((d) => { d.header.subtitle[lang] = v; })}
                placeholder={t('discussions.subtitle')}
                className="mt-1.5 block text-sm text-gray-500 md:text-base"
              />
            </div>

            {/* ── Filters ────────────────────────────────────────────────── */}
            <Reveal>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('discussions.searchPlaceholder')}
                      aria-label={t('discussions.searchPlaceholder')}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                    />
                  </div>
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
                        onClick={() => setParams({ category: null, language: null, search: null, page: null })}
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
              <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-red-200 bg-white p-10 text-center">
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.error.body, locale) || t('discussions.loadError')}
                  onCommit={(v) => setField((d) => { d.error.body[lang] = v; })}
                  placeholder={t('discussions.loadError')}
                  className="block font-medium text-gray-600"
                />
              </div>
            ) : loading && !data ? (
              <div className="mt-8 grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-lg skeleton" />
                ))}
              </div>
            ) : total === 0 && !moderate ? (
              <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
                  <MessagesSquare className="h-6 w-6" />
                </span>
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(hasFilters ? content.emptyFiltered.body : content.empty.body, locale)}
                  onCommit={(v) => setField((d) => {
                    if (hasFilters) d.emptyFiltered.body[lang] = v;
                    else d.empty.body[lang] = v;
                  })}
                  placeholder={hasFilters ? t('discussions.emptyFiltered') : t('discussions.empty')}
                  className="mt-4 block font-medium text-gray-500"
                />
              </div>
            ) : (
              <>
                <div
                  className={`mt-8 grid gap-3 lg:grid-cols-2 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {data?.items.map((q) => (
                    <div key={q.id} className="relative">
                      <DiscussionCard question={q} locale={locale} />
                      {moderate && (
                        <div className="absolute end-2 top-2 z-10 flex gap-1">
                          <button
                            type="button"
                            onClick={() => act(q, 'hide')}
                            disabled={busyId === q.id}
                            aria-label={t('discussions.manage.hide')}
                            title={t('discussions.manage.hide')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          >
                            {busyId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => act(q, 'lock')}
                            disabled={busyId === q.id}
                            aria-label={t('discussions.manage.lock')}
                            title={t('discussions.manage.lock')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-rmc-green disabled:opacity-50"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(q)}
                            disabled={busyId === q.id}
                            aria-label={t('discussions.manage.delete')}
                            title={t('discussions.manage.delete')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {total === 0 && moderate && (
                  <p className="mt-8 text-center text-sm text-gray-400">{t('discussions.empty')}</p>
                )}

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

      <ConfirmModal
        open={!!confirmDelete}
        title={t('discussions.manage.delete')}
        message={t('discussions.manage.deleteConfirm')}
        confirmLabel={t('discussions.manage.delete')}
        variant="danger"
        isLoading={!!confirmDelete && busyId === confirmDelete.id}
        onConfirm={() => { if (confirmDelete) void act(confirmDelete, 'delete'); }}
        onClose={() => (busyId ? undefined : setConfirmDelete(null))}
      />
    </div>
  );
}

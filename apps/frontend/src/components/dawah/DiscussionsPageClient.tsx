'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, EyeOff, Loader2, MessageSquarePlus, MessagesSquare, Search, Trash2, X,
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ConfirmModal, Modal, ModalBody, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { ContentKeys, DISCUSSIONS_DEFAULT, pick, type DiscussionsContent, type Locale } from '@/lib/content-api';
import { DiscussionCard } from './DiscussionCard';
import { EssentialAnswersPanel } from './EssentialAnswersPanel';
import { MostReadPanel } from './MostReadPanel';
import { AskQuestionFields } from './AskQuestionForm';
import {
  dawahApi,
  serverMessage,
  type DiscussionListItem,
  type Paginated,
} from '@/lib/dawahApi';

const PAGE_SIZE = 12;

/**
 * Dawah Q&A — the listing: a chronological feed beside a curated collection.
 *
 * Same discipline as CoursesPageClient: searching is SERVER-SIDE and the URL is the single
 * source of truth, so a result set is shareable and survives the back button.
 *
 * ── Two panels, and where the category filter went ───────────────────────────────────
 *
 * "New Answers" is the feed — everything, newest first, searchable. "The Essential
 * Answers" is what RMC chose, grouped under its own category tabs.
 *
 * The category dropdown is gone from the feed's toolbar. It used to sit beside the search
 * box; now the curated panel carries category as tabs, and two category controls on one
 * screen is one too many — a reader who picked "Fiqh" in one and "Hadith" in the other
 * would be looking at a page that contradicts itself. Category survives in the URL, so a
 * link to `?category=fiqh` still narrows the feed; nothing on the page sets it any more.
 *
 * Language is still a property of each entry (badged on the row, driving its `dir`); it is
 * not a thing to filter on.
 *
 * The listing therefore shows every language at once, which is deliberate and worth
 * keeping: this community is majority Kinyarwanda and the corpus is mixed, so a reader who
 * silently saw only their own locale would land on a section that looks abandoned.
 *
 * The page doubles as its own CMS via the site-wide in-context Edit Mode
 * (`lib/edit-mode`): `useEditableContent` makes the header/empty/error prose editable
 * (content:edit), and — for a `discussions:moderate` holder in edit mode — each row grows
 * withdraw/delete controls so it can be moderated from the public listing. Everyone else
 * sees exactly the page they always did.
 */
export function DiscussionsPageClient() {
  const t = useTranslations('dawah');
  const tCommon = useTranslations('common');
  const tCms = useTranslations('cms');
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
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  // Typed-but-not-yet-committed search text; mirrors the URL when it changes underneath
  // us (back button, Clear filters).
  const [searchInput, setSearchInput] = useState(search);
  const [data, setData] = useState<Paginated<DiscussionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Moderation (edit mode only). `refreshKey` re-runs the fetch after an action
  // drops a question from the published list, without disturbing the URL filters.
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscussionListItem | null>(null);

  // Asking happens in a modal over the listing rather than on its own route: a member
  // asking a question has almost always just searched and not found it, so sending them
  // away from the results loses the thing they were about to reference. Deliberately NOT
  // in the URL — an open composer is transient UI, and putting it in the query string
  // makes a half-typed question look like a shareable link.
  const [askOpen, setAskOpen] = useState(false);

  // Closing the composer destroys the draft (the form unmounts with it), so dismissal is
  // guarded in two layers rather than one:
  //   · the modal ignores Escape and backdrop clicks — those are accidents, and neither
  //     announces itself before throwing work away;
  //   · the close button still works, but asks first once something has been written.
  // Either alone leaves a hole: gestures-only still loses a draft to a misclicked X, and
  // confirm-only nags on every stray backdrop click.
  const [askDirty, setAskDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const closeAsk = useCallback(() => {
    setConfirmDiscard(false);
    setAskOpen(false);
    setAskDirty(false);
  }, []);

  // What the close button routes through: confirm only when there is writing to lose.
  const requestCloseAsk = useCallback(() => {
    if (askDirty) setConfirmDiscard(true);
    else closeAsk();
  }, [askDirty, closeAsk]);

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
    let cancelled = false;
    setLoading(true);
    dawahApi.discussions
      .list({
        category: category || undefined,
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
  }, [category, search, page, refreshKey]);

  // Withdraw an entry straight from the listing. Both actions remove it from the
  // published list, so we refetch on success. Delete is confirmed first.
  // `lock` is gone with the forum: locking stopped further answers, and there are
  // no further answers to stop.
  const act = useCallback(
    async (q: DiscussionListItem, action: 'hide' | 'delete') => {
      setBusyId(q.id);
      try {
        await dawahApi.admin.discussions.moderate(q.id, action);
        success(t('discussions.admin.acted'));
        setConfirmDelete(null);
        setRefreshKey((k) => k + 1);
      } catch (err) {
        toastError(serverMessage(err) ?? t('discussions.admin.actError'));
      } finally {
        setBusyId(null);
      }
    },
    [success, toastError, t],
  );

  const hasFilters = Boolean(category || search);

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));


  return (
    <div className="min-h-screen">
      <Navbar solid />
      <main>
        <section className="relative bg-gray-50/60 pb-10 pt-24 md:pb-14 md:pt-28">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Page heading ───────────────────────────────────────────── */}
            <div className="mb-8">
              <Link
                href={`/${locale}/dawah`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-rmc-green"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t('backToDawah')}
              </Link>

              <div className="mx-auto mt-6 max-w-2xl text-center">
                <InlineText
                  as="h1"
                  lang={locale}
                  value={pick(content.header.title, locale) || t('discussions.title')}
                  onCommit={(v) => setField((d) => { d.header.title[lang] = v; })}
                  placeholder={t('discussions.title')}
                  className="block text-2xl font-bold text-rmc-green-deep md:text-3xl"
                />
                {/* The house heading rule: the decorative gold ornament beneath, never a
                    solid underline bar. */}
                <div className="ornament-divider mx-auto my-4 max-w-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
                </div>
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(content.header.subtitle, locale) || t('discussions.subtitle')}
                  onCommit={(v) => setField((d) => { d.header.subtitle[lang] = v; })}
                  placeholder={t('discussions.subtitle')}
                  className="block text-sm leading-relaxed text-gray-500 md:text-base"
                />
              </div>
            </div>

            {/* Asking, above both panels.
                It used to sit under the feed, on the reasoning that a reader arrives to
                find out whether their question is already answered and asks only once it
                is not. That holds for a single list; it stops holding here, where the
                page opens with a curated collection rather than with search results. The
                offer is now visible without scrolling past two panels to find it.

                Still gated on being signed in: the submit endpoint 401s otherwise, and a
                button that leads to a wall is a worse offer than no button. */}
            {isAuthenticated && (
              <div className="mb-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setAskOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-rmc-green/30 bg-white px-5 py-2.5 text-sm font-semibold text-rmc-green shadow-sm transition-colors hover:bg-rmc-green hover:text-white"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden />
                  {t('discussions.askCta')}
                </button>
              </div>
            )}

            {/* Two panels: the feed, and what RMC curated out of it.
                Below `lg` they stack with the curated set FIRST — on a phone a reader
                scrolling a chronological feed has to know what they are looking for,
                whereas the curated set is the answer to "where do I start?". */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
              {/* The left column: the feed, with the most-read shortlist beneath it.
                  The wrapper is the grid child; the panel styling moves inside so the
                  two panels are siblings rather than one nested in the other. */}
              <div className="order-2 min-w-0 lg:order-1">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                {/* Named now, where before the count stood in for a heading. With a
                    second panel beside it the two have to be told apart, and "12
                    questions" does not say which list it is counting. */}
                <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-gray-100 pb-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green">
                    <MessagesSquare className="h-5 w-5" aria-hidden />
                  </span>
                  <InlineText
                    as="h2"
                    lang={locale}
                    value={pick(content.panels.newTitle, locale)}
                    onCommit={(v) => setField((d) => { d.panels.newTitle[lang] = v; })}
                    className="text-lg font-bold text-rmc-green-deep"
                  />
                  <span className="text-xs text-gray-400">
                    · {t('discussions.count', { count: total })}
                  </span>
                  {/* Say it plainly that the list is mixed-language — a reader seeing
                      Arabic on the English page should know it is deliberate. */}
                  <span className="text-xs text-gray-400">· {t('discussions.otherLanguages')}</span>
                </div>

                {/* Search sits with the questions, not in a rail beside them: it filters
                    this list, and the result it produces is the list directly below. In a
                    separate column the input and its effect were never in view together. */}
                <div className="mb-4">
                  <label htmlFor="discussions-search" className="sr-only">
                    {t('discussions.searchLabel')}
                  </label>
                  {/* Search alone now. Category moved to the curated panel's tabs, and
                      two category controls on one screen is one too many — see the file
                      docblock. A `?category=` in the URL still narrows this list. */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative sm:flex-1">
                    <Search
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                    <input
                      id="discussions-search"
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('discussions.searchPlaceholder')}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pe-4 ps-9 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                    />
                  </div>

                  </div>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => setParams({ category: null, search: null, page: null })}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light"
                    >
                      <X className="h-3.5 w-3.5" /> {t('discussions.clearFilters')}
                    </button>
                  )}
                </div>
            {/* ── The list ───────────────────────────────────────────────── */}
            {failed ? (
              <div className="rounded-lg border border-dashed border-red-200 bg-white p-10 text-center">
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
              <div className="mt-2 grid gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg skeleton" />
                ))}
              </div>
            ) : total === 0 && !moderate ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
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
                {/* One column, not two: question titles are lines of prose, and a 2-up
                    grid halves the width each one gets to sit on. */}
                <div
                  className={`grid gap-2.5 transition-opacity duration-200 ${
                    loading ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {data?.items.map((q) => (
                    <div key={q.id} className="relative">
                      <DiscussionCard
                        question={q}
                        locale={locale}
                        showDate
                      />
                      {/* Absolutely positioned OVER the card, which is one big link — a
                          moderation button inside it would be a nested interactive
                          element, and clicking hide would also navigate. The inset keeps
                          them clear of the title, which wraps to two lines. */}
                      {moderate && (
                        <div className="absolute end-10 top-3 z-10 flex gap-1">
                          <button
                            type="button"
                            onClick={() => act(q, 'hide')}
                            disabled={busyId === q.id}
                            aria-label={t('discussions.admin.hide')}
                            title={t('discussions.admin.hide')}
                            className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          >
                            {busyId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(q)}
                            disabled={busyId === q.id}
                            aria-label={t('discussions.admin.delete')}
                            title={t('discussions.admin.delete')}
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

                <Pagination
                  className="mt-8"
                  page={page}
                  pages={pages}
                  onChange={(p) => setParams({ page: p > 1 ? p : null })}
                  labels={{
                    previous: tCommon('pagination.previous'),
                    next: tCommon('pagination.next'),
                    nav: tCommon('pagination.nav'),
                  }}
                />
              </>
            )}
              </div>

                {/* Below the feed, in the same column. A reader should meet what is
                    new before what is popular — put the shortlist first and the
                    popular entries become the only ones that ever get read. */}
                <MostReadPanel
                  locale={locale}
                  title={
                    <InlineText
                      as="span"
                      lang={locale}
                      value={pick(content.panels.mostReadTitle, locale)}
                      onCommit={(v) => setField((d) => { d.panels.mostReadTitle[lang] = v; })}
                    />
                  }
                  renderItem={(item) => (
                    <DiscussionCard question={item} locale={locale} showViews />
                  )}
                />
              </div>

              {/* The curated panel. It owns its own fetch and its own tabs, so a
                  reader narrowing the feed by search does not empty it — the two
                  panels answer different questions and should not move together. */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-24">
                <EssentialAnswersPanel
                  locale={locale}
                  seeAllHref={`/${locale}/dawah/discussions?essential=true`}
                  title={
                    <InlineText
                      as="span"
                      lang={locale}
                      value={pick(content.panels.essentialTitle, locale)}
                      onCommit={(v) => setField((d) => { d.panels.essentialTitle[lang] = v; })}
                      className="min-w-0"
                    />
                  }
                  body={
                    <InlineText
                      as="p"
                      lang={locale}
                      value={pick(content.panels.essentialBody, locale)}
                      onCommit={(v) => setField((d) => { d.panels.essentialBody[lang] = v; })}
                      className="block"
                    />
                  }
                  renderItem={(item) => (
                    <DiscussionCard question={item} locale={locale} compact />
                  )}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Mounted only while open, so a closed composer holds no half-typed draft and the
          next open starts clean — the same reason the form resets rather than persists.
          That is also precisely why dismissal is guarded: see the state above. */}
      <Modal open={askOpen} onClose={requestCloseAsk} size="xl" closeOnGesture={false}>
        <ModalHeader>
          <ModalTitle>{t('discussions.ask.heading')}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {/* The receipt closes outright: the question is sent, so there is no draft. */}
          <AskQuestionFields onDone={closeAsk} onDirtyChange={setAskDirty} />
        </ModalBody>
      </Modal>

      <ConfirmModal
        open={confirmDiscard}
        title={t('discussions.ask.discardTitle')}
        message={t('discussions.ask.discardBody')}
        confirmLabel={tCms('discard')}
        cancelLabel={tCommon('cancel')}
        variant="danger"
        onConfirm={closeAsk}
        onClose={() => setConfirmDiscard(false)}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title={t('discussions.admin.delete')}
        message={t('discussions.admin.deleteConfirmBody')}
        confirmLabel={t('discussions.admin.delete')}
        variant="danger"
        isLoading={!!confirmDelete && busyId === confirmDelete.id}
        onConfirm={() => { if (confirmDelete) void act(confirmDelete, 'delete'); }}
        onClose={() => (busyId ? undefined : setConfirmDelete(null))}
      />
    </div>
  );
}

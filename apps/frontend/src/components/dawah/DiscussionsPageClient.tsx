'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, ArrowRight, EyeOff, Loader2, MessagesSquare, Plus, Search, Trash2, X,
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
import { AskQuestionFields } from './AskQuestionForm';
import {
  dawahApi,
  serverMessage,
  type DiscussionQuestion,
  type Paginated,
} from '@/lib/dawahApi';

const PAGE_SIZE = 12;

/**
 * Dawah Q&A — the listing. A search box and an accordion of entries, nothing else.
 *
 * Same discipline as CoursesPageClient: searching is SERVER-SIDE and the URL is the single
 * source of truth, so a result set is shareable and survives the back button.
 *
 * ── One control, deliberately ────────────────────────────────────────────────────────
 *
 * The category and language dropdowns are gone. Against a knowledge base with one
 * canonical answer per entry, typing the words you want beats narrowing by a taxonomy you
 * have to learn first — and since the server searches the ANSWER text too, a category
 * filter largely duplicated a query that works better. Language is still a property of
 * each entry (badged on the row, driving its `dir`); it is just not a thing to filter on.
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

  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  // Typed-but-not-yet-committed search text; mirrors the URL when it changes underneath
  // us (back button, Clear filters).
  const [searchInput, setSearchInput] = useState(search);
  const [data, setData] = useState<Paginated<DiscussionQuestion> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Which entries are expanded. A Set of ids, not a single id: opening one row does not
  // close another (see DiscussionCard). Deliberately NOT in the URL — an accordion state
  // in the query string makes every toggle a history entry, so Back stops meaning "the
  // previous page" and starts meaning "the last thing I collapsed".
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  // Moderation (edit mode only). `refreshKey` re-runs the fetch after an action
  // drops a question from the published list, without disturbing the URL filters.
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscussionQuestion | null>(null);

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
    // A new result set means new rows; carrying the open set across would silently
    // re-expand whatever happened to share an id after paging back and forth.
    setOpenIds(new Set());
    dawahApi.discussions
      .list({
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
  }, [search, page, refreshKey]);

  // Withdraw an entry straight from the listing. Both actions remove it from the
  // published list, so we refetch on success. Delete is confirmed first.
  // `lock` is gone with the forum: locking stopped further answers, and there are
  // no further answers to stop.
  const act = useCallback(
    async (q: DiscussionQuestion, action: 'hide' | 'delete') => {
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

  const hasFilters = Boolean(search);
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

            {/* ── Two columns: the entries, and a rail that stays with you ── */}
            {/* Same split as the tenders board — content left, controls right. The rail is
                sticky because search is the primary way through a knowledge base: having
                to scroll back to the top to refine a query is the one interaction this
                page must not make expensive.

                NOT wrapped in <Reveal>: that keeps a transform on the element even once
                visible, which silently makes `position: sticky` do nothing. */}
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr,340px]">
              <div className="min-w-0">
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
                {/* One column, not two. An accordion in a 2-up grid shifts its neighbour
                    down every time a row expands, so the entry you were reading jumps. */}
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
                        open={openIds.has(q.id)}
                        onToggle={() => toggleOpen(q.id)}
                      />
                      {/* end-10 clears the disclosure chevron, which sits at end-4. An
                          overlay on top of it would both hide the affordance and swallow
                          the click that opens the row. */}
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

              {/* ── Rail ─────────────────────────────────────────────────── */}
              <aside className="space-y-4 lg:sticky lg:top-24">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <label
                    htmlFor="discussions-search"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400"
                  >
                    {t('discussions.searchLabel')}
                  </label>
                  <div className="relative">
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

                  <p className="mt-3 text-xs text-gray-500">
                    {t('discussions.count', { count: total })}
                    {/* Say it plainly that the list is mixed-language — a reader seeing
                        Arabic on the English page should know it is deliberate. */}
                    <span className="ms-1.5 text-gray-400">· {t('discussions.otherLanguages')}</span>
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={() => setParams({ search: null, page: null })}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light"
                    >
                      <X className="h-3.5 w-3.5" /> {t('discussions.clearFilters')}
                    </button>
                  )}
                </div>

                {/* Ask only shows to signed-in members — the form 401s otherwise, and a
                    button that leads to a wall is a worse offer than no button. */}
                {isAuthenticated && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm font-bold text-gray-900">{t('discussions.askPrompt')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      {t('discussions.askRailHint')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAskOpen(true)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rmc-green px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t('discussions.askCta')}
                    </button>
                  </div>
                )}
              </aside>
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

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Clock, ArrowRight, AlertCircle, Paperclip, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '@/lib/public-api';
import { useTranslations } from 'next-intl';
import { readDeadline, getLifecycle, type Lifecycle } from '@/lib/deadline';

type I18n = { en: string; rw: string; ar: string };

export type Tender = {
  id: string;
  slug: string | null;
  title: string;
  content: string;
  titleI18n: I18n | null;
  contentI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;
};

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

type Filter = 'all' | 'open' | 'closing' | 'closed';
type Status = Lifecycle;

function deadlineLabel(
  expiresAt: string | null,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  const deadline = readDeadline(expiresAt);
  switch (deadline.state) {
    case 'none':
      return t('deadline.none');
    case 'closed':
      return t('deadline.closed');
    case 'today':
      return t('deadline.today');
    case 'tomorrow':
      return t('deadline.tomorrow');
    default:
      return t('deadline.inDays', { days: deadline.days });
  }
}

// Status drives every accent on a card — bar, dot, chip and deadline pill — so
// an opportunity's state reads at a glance. Classes are spelled out in full so
// Tailwind's JIT keeps them.
const STATUS_STYLES: Record<
  Status,
  { bar: string; dot: string; chip: string; deadline: string; hoverBorder: string; titleHover: string }
> = {
  open: {
    bar: 'bg-rmc-green',
    dot: 'bg-rmc-green',
    chip: 'bg-rmc-green/10 text-rmc-green',
    deadline: 'bg-rmc-green/10 text-rmc-green',
    hoverBorder: 'hover:border-rmc-green/30',
    titleHover: 'group-hover:text-rmc-green',
  },
  closing: {
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600',
    deadline: 'bg-amber-50 text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    titleHover: 'group-hover:text-amber-600',
  },
  closed: {
    bar: 'bg-gray-300',
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-500',
    deadline: 'bg-gray-100 text-gray-400',
    hoverBorder: 'hover:border-gray-300',
    titleHover: 'group-hover:text-gray-700',
  },
};

const FILTER_KEYS: Filter[] = ['all', 'open', 'closing', 'closed'];

interface TenderListProps {
  /**
   * 'grid' (default) — search + filters stacked above a 3-column card grid, used
   * by the standalone /tenders board. 'sidebar' — two columns: a left rail
   * (optional `aside`, then filters at 8px radius) beside a single-column list of
   * tenders, used by the /services/tender landing.
   */
  variant?: 'grid' | 'sidebar';
  /** Rendered in the left column, above the filters + list (e.g. the heading + note). */
  listHeader?: ReactNode;
  /** Rendered at the bottom of the right rail in the 'sidebar' variant (e.g. how-to steps). */
  railBottom?: ReactNode;
}

/**
 * The public tender board — search + status filters + tender cards. Fetches its
 * own data, so it can be dropped onto any page (the `/tenders` board and the
 * `/services/tender` landing both use it). Card design is shared here so the two
 * entry points can never drift apart.
 */
export function TenderList({ variant = 'grid', listHeader, railBottom }: TenderListProps) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('tenders');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    publicApi
      .getAnnouncements('tender', 50, true)
      .then(setTenders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Search first, then status — so the tab counts reflect what the search found.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenders;
    return tenders.filter((tender) => {
      const title = resolveText(tender.titleI18n, tender.title, locale).toLowerCase();
      const content = resolveText(tender.contentI18n, tender.content, locale).toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [tenders, query, locale]);

  const filtered = useMemo(() => {
    if (filter === 'all') return searched;
    return searched.filter((tender) => getLifecycle(tender.expiresAt) === filter);
  }, [searched, filter]);

  const counts = useMemo(
    () => ({
      all: searched.length,
      open: searched.filter((tender) => getLifecycle(tender.expiresAt) === 'open').length,
      closing: searched.filter((tender) => getLifecycle(tender.expiresAt) === 'closing').length,
      closed: searched.filter((tender) => getLifecycle(tender.expiresAt) === 'closed').length,
    }),
    [searched],
  );

  const hasQuery = query.trim().length > 0;

  const isSidebar = variant === 'sidebar';
  // 8px radius on the controls in the sidebar rail; the standalone board keeps
  // its pill controls.
  const controlRadius = isSidebar ? 'rounded-lg' : 'rounded-full';
  // Sidebar shows a single-column list; the board shows a responsive grid.
  const resultsGridClass = isSidebar ? 'grid grid-cols-1 gap-4' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';

  // Client-side pagination over the filtered set — search, filters and the tab
  // counts all need the full set, so the page is sliced here rather than server-side.
  const PER_PAGE = isSidebar ? 5 : 9;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1); // any search/filter change starts over at page 1
  }, [filter, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const renderCard = (tender: Tender, i: number) => {
    const status = getLifecycle(tender.expiresAt);
    const styles = STATUS_STYLES[status];
    const deadline = readDeadline(tender.expiresAt);
    const attachCount = tender.attachments?.length ?? 0;
    const isRtl = locale === 'ar';
    const displayTitle = resolveText(tender.titleI18n, tender.title, locale);
    const displayContent = resolveText(tender.contentI18n, tender.content, locale);

    // Sidebar list: a simple horizontal row, mirroring the leadership cards on
    // the About page — icon frame, a status pill, the title, and a line of meta.
    if (isSidebar) {
      return (
        <Link
          key={tender.id}
          href={`/${locale}/tenders/${tender.slug ?? tender.id}`}
          className={`group flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${styles.hoverBorder}`}
        >
          {/* Icon frame — gradient green→gold ring, like the leader portraits */}
          <div className="relative shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-deep ring-2 ring-white">
              <FileText className="h-7 w-7 text-white/90" strokeWidth={1.5} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              {t(`filters.${status}`)}
            </span>

            <h3
              dir={isRtl ? 'rtl' : 'ltr'}
              className={`mt-2 truncate font-medium text-gray-900 transition-colors ${styles.titleHover} ${isRtl ? 'font-arabic' : ''}`}
            >
              {displayTitle}
            </h3>

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                {deadlineLabel(tender.expiresAt, (key, values) =>
                  t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]),
                )}
              </span>
              {attachCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  {attachCount}
                </span>
              )}
            </div>
          </div>

          {/* Styled as a button, but it's a span — the whole row is the link. */}
          <span className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors group-hover:border-rmc-green group-hover:bg-rmc-green group-hover:text-white">
            {t('card.viewDetails')}
          </span>
        </Link>
      );
    }

    return (
      <Link
        key={tender.id}
        href={`/${locale}/tenders/${tender.slug ?? tender.id}`}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70 ${styles.hoverBorder}`}
      >
        {/* Status accent bar — always visible */}
        <span className={`h-1 w-full shrink-0 ${styles.bar}`} />

        <div className="flex flex-1 flex-col p-6">
          {/* Top row: status chip + attachments/index */}
          <div className="flex items-center justify-between mb-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              {t(`filters.${status}`)}
            </span>
            <div className="flex items-center gap-2">
              {attachCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Paperclip className="w-2.5 h-2.5" />
                  {attachCount}
                </span>
              )}
              <span className="font-mono text-[11px] tracking-widest text-gray-200 tabular-nums group-hover:text-gray-300 transition-colors">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-2">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
              <FileText className="w-4 h-4 text-gray-400" />
            </span>
            <h2
              dir={isRtl ? 'rtl' : 'ltr'}
              className={`flex-1 font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 transition-colors duration-300 ${styles.titleHover} ${isRtl ? 'font-arabic' : ''}`}
            >
              {displayTitle}
            </h2>
          </div>

          {/* Excerpt */}
          <p
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`text-gray-500 text-[13px] leading-relaxed line-clamp-2 flex-1 mb-5 ${isRtl ? 'font-arabic' : ''}`}
          >
            {displayContent}
          </p>

          {/* Footer: deadline + view */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${styles.deadline}`}>
              <Clock className="w-3 h-3" />
              {deadlineLabel(tender.expiresAt, (key, values) =>
                t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]),
              )}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-400 group-hover:text-rmc-green transition-colors">
              {t('card.view')}
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          {/* Urgency bar for closing-soon tenders */}
          {status === 'closing' && deadline.days !== null && (
            <div className="mt-3 h-1 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.max(5, 100 - (deadline.days / 7) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </Link>
    );
  };

  const search = (
    <div className={`relative ${isSidebar ? '' : 'max-w-md'}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className={`w-full ${controlRadius} border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/20`}
      />
      {hasQuery && (
        <button
          onClick={() => setQuery('')}
          aria-label={t('search.clear')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const filters = (
    <div className="flex flex-wrap gap-2">
      {FILTER_KEYS.map((key) => {
        const active = filter === key;
        return (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 ${controlRadius} text-sm font-medium border transition-all duration-200 ${
              active
                ? 'bg-rmc-green text-white border-rmc-green shadow-sm shadow-rmc-green/20'
                : 'bg-white text-gray-500 border-gray-200 hover:border-rmc-green/40 hover:text-rmc-green'
            }`}
          >
            {t(`filters.${key}`)}
            {!loading && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const results = loading ? (
    <div className={resultsGridClass}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-56 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <div className="h-1 w-full bg-gray-100" />
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-5 w-24 rounded-full bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-5/6 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <div className="text-center py-24 rounded-3xl border border-dashed border-gray-200 bg-white/60">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
        <AlertCircle className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-base font-semibold text-gray-500">{t('empty.title')}</p>
      <p className="text-sm text-gray-400 mt-1">
        {hasQuery
          ? t('empty.noMatch', { query: query.trim() })
          : filter === 'all'
            ? t('empty.allSubtitle')
            : t(`filters.${filter}`)}
      </p>
      {(filter !== 'all' || hasQuery) && (
        <button
          onClick={() => {
            setFilter('all');
            setQuery('');
          }}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
        >
          {t('empty.viewAll')} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  ) : (
    <div className={resultsGridClass}>{paged.map(renderCard)}</div>
  );

  const pagination = !loading && pageCount > 1 && (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        aria-label={t('pagination.previous')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setPage(n)}
          aria-current={n === currentPage ? 'page' : undefined}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            n === currentPage
              ? 'bg-rmc-green text-white'
              : 'border border-gray-200 text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green'
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        disabled={currentPage >= pageCount}
        aria-label={t('pagination.next')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </nav>
  );

  // Sidebar: heading + filters + list on the left; search + extras in a right rail.
  if (isSidebar) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8 items-start">
        <div className="space-y-5">
          {listHeader}
          {filters}
          {results}
          {pagination}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          {search}
          {railBottom}
        </aside>
      </div>
    );
  }

  // Standalone board: search, then filters, then the grid.
  return (
    <div>
      <div className="mb-5">{search}</div>
      <div className="mb-8">{filters}</div>
      {results}
      {pagination}
    </div>
  );
}

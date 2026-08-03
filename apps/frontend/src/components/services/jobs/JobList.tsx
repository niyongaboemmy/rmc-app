'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Briefcase, Clock, MapPin, Users, ArrowRight, AlertCircle, Search, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { deadlineInfo, statusOf, type JobStatus } from './jobFormat';
import { JobCard } from './JobCard';

type Filter = 'all' | JobStatus;

// Status drives every accent — bar, dot, chip and deadline pill — mirroring the
// Tenders board. Classes are spelled out in full so Tailwind's JIT keeps them.
const STATUS_STYLES: Record<
  JobStatus,
  { dot: string; chip: string; deadline: string; hoverBorder: string; titleHover: string }
> = {
  open: {
    dot: 'bg-rmc-green',
    chip: 'bg-rmc-green/10 text-rmc-green',
    deadline: 'bg-rmc-green/10 text-rmc-green',
    hoverBorder: 'hover:border-rmc-green/30',
    titleHover: 'group-hover:text-rmc-green',
  },
  closing: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600',
    deadline: 'bg-amber-50 text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    titleHover: 'group-hover:text-amber-600',
  },
  closed: {
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-500',
    deadline: 'bg-gray-100 text-gray-400',
    hoverBorder: 'hover:border-gray-300',
    titleHover: 'group-hover:text-gray-700',
  },
};

const FILTER_KEYS: Filter[] = ['all', 'open', 'closing', 'closed'];

interface JobListProps {
  /**
   * 'grid' (default) — search + filters stacked above a 3-column card grid.
   * 'sidebar' — two columns: a left rail (optional `listHeader`, then filters +
   * a single-column list) beside a right rail (search + `railBottom`), used by
   * the /services/jobs landing. Mirrors the Tenders board so the two never drift.
   */
  variant?: 'grid' | 'sidebar';
  /** Rendered in the left column, above the filters + list (e.g. the heading + note). */
  listHeader?: ReactNode;
  /** Rendered at the bottom of the right rail in the 'sidebar' variant (e.g. how-to steps). */
  railBottom?: ReactNode;
}

/**
 * The public jobs board — search + status filters + posting cards. Fetches its
 * own data, so it can be dropped onto any page. Card design is shared here so
 * every entry point stays in sync (mirrors TenderList).
 */
export function JobList({ variant = 'grid', listHeader, railBottom }: JobListProps) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.jobs.openings');
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    jobPostingsApi
      .listOpen()
      .then(setPostings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Search first, then status — so the tab counts reflect what the search found.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return postings;
    return postings.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q) ||
      (p.location ?? '').toLowerCase().includes(q),
    );
  }, [postings, query]);

  const filtered = useMemo(() => {
    if (filter === 'all') return searched;
    return searched.filter((p) => statusOf(p) === filter);
  }, [searched, filter]);

  const counts = useMemo(
    () => ({
      all: searched.length,
      open: searched.filter((p) => statusOf(p) === 'open').length,
      closing: searched.filter((p) => statusOf(p) === 'closing').length,
      closed: searched.filter((p) => statusOf(p) === 'closed').length,
    }),
    [searched],
  );

  const hasQuery = query.trim().length > 0;

  const isSidebar = variant === 'sidebar';
  const controlRadius = isSidebar ? 'rounded-lg' : 'rounded-full';
  const resultsGridClass = isSidebar ? 'grid grid-cols-1 gap-4' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';

  const PER_PAGE = isSidebar ? 5 : 9;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function deadlineLabel(deadline: string | null): string {
    const dl = deadlineInfo(deadline);
    if (dl.daysLeft === null) return t('noDeadline');
    if (dl.passed) return t('applicationsClosed');
    if (dl.daysLeft === 0) return t('closesToday');
    if (dl.daysLeft === 1) return t('closesTomorrow');
    return t('closesInDays', { days: dl.daysLeft });
  }

  const renderCard = (p: JobPosting, i: number) => {
    const status = statusOf(p);
    const styles = STATUS_STYLES[status];

    // Sidebar list: a horizontal row — icon frame, a status pill, the title, and
    // a line of meta — mirroring the Tenders sidebar card.
    if (isSidebar) {
      return (
        <Link
          key={p.id}
          href={`/${locale}/services/jobs/openings/${p.id}`}
          className={`group flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${styles.hoverBorder}`}
        >
          {/* Icon frame — gradient green→gold ring */}
          <div className="relative shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-deep ring-2 ring-white">
              <Briefcase className="h-7 w-7 text-white/90" strokeWidth={1.5} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              {t(`filters.${status}`)}
            </span>

            <h3 className={`mt-2 truncate font-medium text-gray-900 transition-colors ${styles.titleHover}`}>
              {p.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                {deadlineLabel(p.applicationDeadline)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                {EMPLOYMENT_TYPE_LABELS[p.employmentType]}
              </span>
              {p.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {p.location}
                </span>
              )}
              {p.numberOfPositions > 1 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {p.numberOfPositions} {t('positions')}
                </span>
              )}
            </div>
          </div>

          {/* Styled as a button, but it's a span — the whole row is the link. */}
          <span className="hidden sm:inline-flex shrink-0 items-center rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors group-hover:border-rmc-green group-hover:bg-rmc-green group-hover:text-white">
            {t('viewDetails')}
          </span>
        </Link>
      );
    }

    return <JobCard key={p.id} posting={p} index={i} />;
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
          aria-label={t('clear')}
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
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 rounded-lg bg-white border border-gray-100 animate-pulse" />
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white/60">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
        <AlertCircle className="w-7 h-7 text-gray-300" />
      </div>
      <p className="text-base font-semibold text-gray-500">{hasQuery ? t('noMatch') : t('none')}</p>
      <p className="text-sm text-gray-400 mt-1">{hasQuery ? t('noMatchSub') : t('noneSub')}</p>
      {(filter !== 'all' || hasQuery) && (
        <button
          onClick={() => { setFilter('all'); setQuery(''); }}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors"
        >
          {t('viewAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
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
        aria-label={t('prev')}
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
        aria-label={t('next')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </nav>
  );

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

  return (
    <div>
      <div className="mb-5">{search}</div>
      <div className="mb-8">{filters}</div>
      {results}
      {pagination}
    </div>
  );
}

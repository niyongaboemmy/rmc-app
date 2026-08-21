'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search, X, Inbox, AlertTriangle, RotateCw, ChevronLeft, ChevronRight, Briefcase,
} from 'lucide-react';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting, type EmploymentType } from '@/lib/jobPostingsApi';
import { JobCard } from './JobCard';

const PAGE_SIZE = 6;

type LoadState = 'loading' | 'error' | 'ready';

export function OpenPositions() {
  const t = useTranslations('services.jobs.openings');

  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<EmploymentType | 'all'>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setState('loading');
    jobPostingsApi
      .listOpen()
      .then((data) => { setPostings(data); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Employment types actually present in the results, in canonical order.
  const availableTypes = useMemo(() => {
    const present = new Set(postings.map((p) => p.employmentType));
    return (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).filter((k) => present.has(k));
  }, [postings]);

  // Client-side search + filter (no extra API calls — the dataset is small).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return postings.filter((p) => {
      if (type !== 'all' && p.employmentType !== type) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.department ?? '').toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q)
      );
    });
  }, [postings, query, type]);

  // Reset to the first page whenever the filters change.
  useEffect(() => { setPage(1); }, [query, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = query.trim() !== '' || type !== 'all';

  const clearFilters = () => { setQuery(''); setType('all'); };

  return (
    <section id="openings" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-7">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2.5">
            {t('title')}
            {state === 'ready' && postings.length > 0 && (
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-rmc-green-light text-rmc-green-dark align-middle">
                {postings.length}
              </span>
            )}
          </h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Toolbar: search + type filter (hidden until there's something to filter) */}
        {state === 'ready' && postings.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative max-w-md mx-auto">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="w-full h-11 ps-10 pe-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('clear')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {availableTypes.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap justify-center" role="group" aria-label={t('typeLabel')}>
                <FilterChip active={type === 'all'} onClick={() => setType('all')}>{t('allTypes')}</FilterChip>
                {availableTypes.map((k) => (
                  <FilterChip key={k} active={type === k} onClick={() => setType(k)}>{EMPLOYMENT_TYPE_LABELS[k]}</FilterChip>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {state === 'loading' ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : state === 'error' ? (
          <StateCard
            icon={<AlertTriangle className="w-10 h-10 text-amber-400" />}
            title={t('errorTitle')}
            subtitle={t('errorSub')}
            action={
              <button
                type="button"
                onClick={load}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/50 focus-visible:ring-offset-1"
              >
                <RotateCw className="w-4 h-4" /> {t('retry')}
              </button>
            }
          />
        ) : postings.length === 0 ? (
          <StateCard icon={<Inbox className="w-10 h-10 text-gray-300" />} title={t('none')} subtitle={t('noneSub')} />
        ) : filtered.length === 0 ? (
          <StateCard
            icon={<Search className="w-10 h-10 text-gray-300" />}
            title={t('noMatch')}
            subtitle={t('noMatchSub')}
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
              >
                <X className="w-4 h-4" /> {t('clear')}
              </button>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 items-stretch">
              {pageItems.map((p) => <JobCard key={p.id} posting={p} />)}
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
                <PagerButton onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={currentPage === 1} aria-label={t('prev')}>
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </PagerButton>
                <span className="text-sm text-gray-500 px-2 tabular-nums">
                  {t('pageLabel')} {currentPage} {t('ofLabel')} {totalPages}
                </span>
                <PagerButton onClick={() => setPage((n) => Math.min(totalPages, n + 1))} disabled={currentPage === totalPages} aria-label={t('next')}>
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </PagerButton>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/40 ${
        active
          ? 'bg-rmc-green text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-rmc-green/40 hover:text-rmc-green'
      }`}
    >
      {children}
    </button>
  );
}

function PagerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/40"
    >
      {children}
    </button>
  );
}

function StateCard({
  icon, title, subtitle, action,
}: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-lg mx-auto">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      {action}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-gray-200" />
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-2.5 bg-gray-100 rounded w-full" />
          <div className="h-2.5 bg-gray-100 rounded w-5/6" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="h-2.5 bg-gray-100 rounded" />
          <div className="h-2.5 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
        <div className="h-8 flex-1 bg-gray-100 rounded-lg" />
        <div className="h-8 flex-1 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

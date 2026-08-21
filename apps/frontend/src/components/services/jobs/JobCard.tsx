'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { deadlineInfo, statusOf, type JobStatus } from './jobFormat';

// Status drives every accent on a card — bar, dot, chip and deadline pill — so a
// role's state reads at a glance, mirroring the Tenders listing. Classes are
// spelled out in full so Tailwind's JIT keeps them.
const STATUS_STYLES: Record<
  JobStatus,
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

/**
 * Job posting card — status-driven like the Tenders listing card. A single
 * clickable surface leading to the details page. Shared by the openings
 * listing and the "other open positions" block on the details page.
 */
export function JobCard({ posting: p, index }: { posting: JobPosting; index?: number }) {
  const t = useTranslations('services.jobs.openings');
  const { locale } = useParams<{ locale: string }>();

  const status = statusOf(p);
  const styles = STATUS_STYLES[status];
  const dl = deadlineInfo(p.applicationDeadline);
  const detailsHref = `/${locale}/services/jobs/openings/${p.id}`;

  function deadlineLabel(): string {
    if (dl.daysLeft === null) return t('noDeadline');
    if (dl.passed) return t('applicationsClosed');
    if (dl.daysLeft === 0) return t('closesToday');
    if (dl.daysLeft === 1) return t('closesTomorrow');
    return t('closesInDays', { days: dl.daysLeft });
  }

  return (
    <Link
      href={detailsHref}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70 ${styles.hoverBorder}`}
    >
      {/* Status accent bar */}
      <span className={`h-1 w-full shrink-0 ${styles.bar}`} />

      <div className="flex flex-1 flex-col p-6">
        {/* Top row: status chip + employment type + index */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {t(`filters.${status}`)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {EMPLOYMENT_TYPE_LABELS[p.employmentType]}
            </span>
            {typeof index === 'number' && (
              <span className="font-mono text-[11px] tracking-widest text-gray-200 tabular-nums group-hover:text-gray-300 transition-colors">
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-2">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
            <Briefcase className="w-4 h-4 text-gray-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={`font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 transition-colors duration-300 ${styles.titleHover}`}>
              {p.title}
            </h3>
            {(p.department || p.location) && (
              <p className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                {p.department && <span>{p.department}</span>}
                {p.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {p.location}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Excerpt */}
        <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 flex-1 mb-5 mt-1">
          {p.description}
        </p>

        {/* Footer: deadline + positions + view */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${styles.deadline}`}>
            <Clock className="w-3 h-3" />
            {deadlineLabel()}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {p.numberOfPositions > 1 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Users className="w-2.5 h-2.5" />
                {p.numberOfPositions}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-gray-400 group-hover:text-rmc-green transition-colors">
              {t('viewDetails')}
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
            </span>
          </div>
        </div>

        {/* Urgency bar for closing-soon roles */}
        {status === 'closing' && dl.daysLeft !== null && dl.daysLeft >= 0 && (
          <div className="mt-3 h-1 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${Math.max(5, 100 - (dl.daysLeft / 7) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

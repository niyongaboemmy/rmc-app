'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Briefcase, MapPin, Wallet, CalendarClock, CalendarDays, Users, ArrowRight, Clock,
} from 'lucide-react';
import { EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { formatDate, deadlineInfo, postedDate, canApplyTo } from './jobFormat';

/**
 * Premium job posting card — shared by the openings listing and the
 * "other open positions" block on the details page. Shows every available
 * field (title, department, type, location, salary, posted date, deadline)
 * and a clear two-action footer (View details + Apply).
 */
export function JobCard({ posting: p }: { posting: JobPosting }) {
  const t = useTranslations('services.jobs.openings');
  const { locale } = useParams<{ locale: string }>();

  const dl = deadlineInfo(p.applicationDeadline);
  const applyable = canApplyTo(p);

  const detailsHref = `/${locale}/services/jobs/openings/${p.id}`;
  const applyHref = `/${locale}/services/jobs/apply?job=${p.id}`;

  return (
    <article className="group relative flex flex-col rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg hover:shadow-rmc-green/10 hover:border-rmc-green/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      <div className="flex flex-col flex-1 p-5">
        {/* Header: icon + title/department + type badge */}
        <div className="flex items-start gap-3.5">
          <span className="w-11 h-11 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0 ring-1 ring-rmc-green/10 group-hover:bg-rmc-green group-hover:ring-rmc-green transition-colors duration-300">
            <Briefcase className="w-5 h-5 text-rmc-green-dark group-hover:text-white transition-colors duration-300" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 leading-snug text-[15px] line-clamp-2">
              <Link href={detailsHref} className="outline-none focus-visible:underline focus-visible:decoration-rmc-green after:absolute after:inset-0 after:content-['']">
                {p.title}
              </Link>
            </h3>
            {p.department && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.department}</p>}
          </div>
        </div>

        {/* Type + positions chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rmc-green-light text-rmc-green-dark">
            <Briefcase className="w-3 h-3" /> {EMPLOYMENT_TYPE_LABELS[p.employmentType]}
          </span>
          {p.numberOfPositions > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              <Users className="w-3 h-3" /> {p.numberOfPositions} {t('positions')}
            </span>
          )}
          {dl.soon && !dl.passed && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <Clock className="w-3 h-3" /> {t('closingSoon')}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mt-3 flex-1">{p.description}</p>

        {/* Meta grid */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 text-xs">
          {p.location && (
            <div className="inline-flex items-center gap-1.5 text-gray-600 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{p.location}</span>
            </div>
          )}
          {p.salaryRange && (
            <div className="inline-flex items-center gap-1.5 text-gray-600 min-w-0">
              <Wallet className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{p.salaryRange}</span>
            </div>
          )}
          {postedDate(p) && (
            <div className="inline-flex items-center gap-1.5 text-gray-600 min-w-0">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{t('posted')} {formatDate(postedDate(p), locale)}</span>
            </div>
          )}
          {p.applicationDeadline && (
            <div className={`inline-flex items-center gap-1.5 min-w-0 ${dl.passed ? 'text-gray-400' : dl.soon ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
              <CalendarClock className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{t('deadline')} {formatDate(p.applicationDeadline, locale)}</span>
            </div>
          )}
        </dl>
      </div>

      {/* Footer actions — z-10 keeps them clickable above the card's overlay link */}
      <div className="relative z-10 flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
        <Link
          href={detailsHref}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold hover:border-rmc-green/40 hover:text-rmc-green transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/40 ${applyable ? 'flex-1' : 'w-full'}`}
        >
          {t('viewDetails')}
        </Link>
        {applyable && (
          <Link
            href={applyHref}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rmc-green text-white text-[13px] font-semibold hover:bg-rmc-green-dark shadow-sm hover:shadow transition-all outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/50 focus-visible:ring-offset-1"
          >
            {t('apply')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

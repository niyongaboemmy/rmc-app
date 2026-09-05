'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GraduationCap, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { scholarshipPublicApi, type ScholarshipProgram } from '@/lib/scholarshipApi';

function getDiffDays(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

type Status = 'open' | 'closing' | 'closed';

/**
 * Mirrors `getStatus` on the tenders board, with one addition: a scholarship
 * can be closed by an admin before its deadline, so the explicit status wins
 * over the date. A tender has no equivalent switch.
 */
function getStatus(program: ScholarshipProgram): Status {
  if (program.status === 'closed') return 'closed';
  const diff = getDiffDays(program.deadline);
  if (diff === null) return 'open';
  if (diff < 0) return 'closed';
  if (diff <= 7) return 'closing';
  return 'open';
}

function deadlineLabel(
  deadline: string | null,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  const diff = getDiffDays(deadline);
  if (diff === null) return t('landing.deadline.none');
  if (diff < 0) return t('landing.deadline.closed');
  if (diff === 0) return t('landing.deadline.today');
  if (diff === 1) return t('landing.deadline.tomorrow');
  return t('landing.deadline.inDays', { days: diff });
}

/**
 * Status drives every accent on the card, so a scholarship's state reads at a
 * glance — the same system the tenders board uses. Classes are spelled out in
 * full so Tailwind's JIT keeps them.
 *
 * Deliberately WITHOUT tenders' `hoverBorder`: the border on these cards stays
 * static by request. The status bar and chip carry the colour instead, and they
 * are visible at rest rather than only on hover.
 */
const STATUS_STYLES: Record<Status, { bar: string; dot: string; chip: string; titleHover: string }> = {
  open: {
    bar: 'bg-rmc-green',
    dot: 'bg-rmc-green',
    chip: 'bg-rmc-green/10 text-rmc-green',
    titleHover: 'group-hover:text-rmc-green',
  },
  closing: {
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600',
    titleHover: 'group-hover:text-amber-600',
  },
  closed: {
    bar: 'bg-gray-300',
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-500',
    titleHover: 'group-hover:text-gray-700',
  },
};

interface ScholarshipProgramsListProps {
  /**
   * 'grid' (default) — a 3-column card grid, for use as a standalone section.
   * 'sidebar' — a single-column list beside a sticky rail, the same shape the
   * tenders board uses (see TenderList). Kept deliberately parallel so the two
   * services can be read side by side and neither drifts.
   */
  variant?: 'grid' | 'sidebar';
  /** Heading rendered above the list in the 'sidebar' variant. */
  listHeader?: ReactNode;
  /** Rendered in the right rail in the 'sidebar' variant (steps, track card…). */
  railBottom?: ReactNode;
}

export function ScholarshipProgramsList({
  variant = 'grid',
  listHeader,
  railBottom,
}: ScholarshipProgramsListProps = {}) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.scholarship');
  const tLevels = useTranslations('services.scholarship.levels');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isSidebar = variant === 'sidebar';
  // One column beside a rail; three across when the list owns the full width.
  const gridClass = isSidebar
    ? 'grid grid-cols-1 gap-4'
    : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';

  /** Wraps whatever the list renders in the two-column shell, when asked for. */
  const shell = (body: ReactNode) =>
    isSidebar ? (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8 items-start">
        <div className="space-y-5">
          {listHeader}
          {body}
        </div>
        {/* Sticky, so the steps and the track card stay with the reader as they
            scroll the list. NOT wrapped in <Reveal>: that keeps a transform on
            the element even once visible, which silently kills position:sticky. */}
        <aside className="space-y-5 lg:sticky lg:top-24">{railBottom}</aside>
      </div>
    ) : (
      <>{body}</>
    );

  useEffect(() => {
    scholarshipPublicApi
      .listPrograms()
      .then(setPrograms)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return shell(
      <div className={gridClass}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${isSidebar ? 'h-36' : 'h-52'} rounded-2xl bg-gray-200 animate-pulse`} />
        ))}
      </div>,
    );
  }

  if (error) {
    return shell(
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
          <AlertCircle className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">{t('landing.programsLoadError')}</p>
      </div>,
    );
  }

  if (programs.length === 0) {
    return shell(
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rmc-green-light mb-5">
          <GraduationCap className="w-7 h-7 text-rmc-green" />
        </div>
        <p className="text-base font-semibold text-gray-400">{t('landing.programsEmptyTitle')}</p>
        <p className="text-sm text-gray-300 mt-1">{t('landing.programsEmptyText')}</p>
      </div>,
    );
  }

  return shell(
    <div className={gridClass}>
      {programs.map((program, i) => {
        const status = getStatus(program);
        const styles = STATUS_STYLES[status];
        // The card opens the scholarship, it does not start an application —
        // an applicant should read the eligibility and deadline before the
        // form. Same as a tender row, which opens the tender. Falls back to the
        // id for any row whose slug was never assigned.
        const href = `/${locale}/services/scholarship/${program.slug ?? program.id}`;

        /* Meta shared by both variants: deadline, level, award. */
        const meta = (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
              {deadlineLabel(program.deadline, (key, values) =>
                t(key as Parameters<typeof t>[0], values as Parameters<typeof t>[1]),
              )}
            </span>
            {program.level && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {tLevels(program.level)}
              </span>
            )}
          </>
        );

        const chip = (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {t(`landing.filters.${status}`)}
          </span>
        );

        // Sidebar: a horizontal row — icon frame, status pill, title, meta line
        // and a view button. The same shape the tenders board uses beside its rail.
        if (isSidebar) {
          return (
            <Link
              key={program.id}
              href={href}
              className="group flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Gradient green→gold ring around the emblem, as on the tender row. */}
              <div className="relative shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-deep ring-2 ring-white">
                  <GraduationCap className="h-7 w-7 text-white/90" strokeWidth={1.5} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                {chip}
                <h3 className={`mt-2 truncate font-medium text-gray-900 transition-colors ${styles.titleHover}`}>
                  {program.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  {meta}
                </div>
              </div>

              {/* Styled as a button, but it is a span — the whole row is the link. */}
              <span className="hidden shrink-0 items-center rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors group-hover:border-rmc-green group-hover:bg-rmc-green group-hover:text-white sm:inline-flex">
                {t('landing.viewAndApply')}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={program.id}
            href={href}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70"
          >
            {/* Status accent bar — always visible, not a hover effect. */}
            <span className={`h-1 w-full shrink-0 ${styles.bar}`} />

            <div className="flex flex-1 flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                {chip}
                <span className="font-mono text-[11px] tracking-widest text-gray-200">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className={`mb-2 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors duration-300 ${styles.titleHover}`}>
                {program.title}
              </h3>

              <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-gray-400">
                {program.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-50 pt-4 text-xs text-gray-500">
                {meta}
              </div>

              <span className="mt-3 inline-flex items-center gap-0.5 self-start text-[10px] font-semibold text-gray-300 transition-colors group-hover:text-rmc-green">
                {t('landing.viewAndApply')} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>,
  );
}

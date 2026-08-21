'use client';

import Link from 'next/link';
import { ArrowRight, Clock, FileText, Paperclip, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveI18n, type Tender } from '@/lib/tendersApi';
import type { TenderApplicationCounts } from '@/lib/tenderApplicationAdminApi';
import { STATUS_LABELS_SHORT } from '@/lib/tenderWorkflow';
import { readDeadline, getLifecycle, type Lifecycle } from '@/lib/deadline';

/**
 * A tender as it appears on the admin picker — a single list row rather than a
 * card, so a large tender list scans top-to-bottom like an inbox instead of
 * wrapping across a grid.
 *
 * What it surfaces is the two numbers an evaluator actually picks a tender by:
 * how many bids came in, and how long is left to decide.
 */

export type TenderLifecycle = Lifecycle;

/** Same thresholds as the public list: inside a week is "closing". */
export { getLifecycle };

export function deadlineLabel(expiresAt: string | null): string {
  const deadline = readDeadline(expiresAt);
  switch (deadline.state) {
    case 'none':
      return 'No deadline';
    // `days` is the calendar gap, so a tender that lapsed this morning is 0 —
    // "Closed 0d ago" reads as a bug. Name the day instead.
    case 'closed':
      return deadline.days === 0 ? 'Closed today' : `Closed ${Math.abs(deadline.days ?? 0)}d ago`;
    case 'today':
      return 'Closes today';
    case 'tomorrow':
      return '1 day left';
    default:
      return `${deadline.days} days left`;
  }
}

const LIFECYCLE_STYLES: Record<
  TenderLifecycle,
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

const LIFECYCLE_LABELS: Record<TenderLifecycle, string> = {
  open: 'Open',
  closing: 'Closing soon',
  closed: 'Closed',
};

/** The pipeline stages worth surfacing on a card — the rest live on the board. */
const HIGHLIGHT_STATUSES = ['shortlisted', 'awarded'] as const;

export function AdminTenderCard({
  tender,
  counts,
  locale,
  href,
}: {
  tender: Tender;
  counts: TenderApplicationCounts | undefined;
  locale: string;
  href: string;
}) {
  const lifecycle = getLifecycle(tender.expiresAt);
  const styles = LIFECYCLE_STYLES[lifecycle];
  const applied = counts?.total ?? 0;
  const attachCount = tender.attachments?.length ?? 0;
  const title = resolveI18n(tender.titleI18n, tender.title, locale);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-gray-200/70 bg-white px-4 py-3.5 transition-colors duration-200 hover:bg-gray-50/60',
        styles.hoverBorder,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
        <FileText className="h-4 w-4 text-gray-400" />
      </span>

      {/* Title + lifecycle/attachment meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              'truncate text-[14px] font-bold leading-snug text-gray-900 transition-colors duration-200',
              styles.titleHover,
            )}
          >
            {title}
          </h2>
          {!tender.isPublished && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              Draft
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              styles.chip,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
            {LIFECYCLE_LABELS[lifecycle]}
          </span>
          {attachCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400">
              <Paperclip className="h-2.5 w-2.5" />
              {attachCount}
            </span>
          )}
        </div>
      </div>

      {/* The two numbers this row exists for: bids in, and time left. */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
            applied > 0 ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-400',
          )}
        >
          <Users className="h-3.5 w-3.5" />
          {applied} applied
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
            styles.deadline,
          )}
        >
          <Clock className="h-3 w-3" />
          {deadlineLabel(tender.expiresAt)}
        </span>
      </div>

      {/* Stage breakdown — only the decisions, and only once they exist. */}
      {applied > 0 && (
        <div className="hidden shrink-0 flex-wrap gap-1.5 lg:flex">
          {HIGHLIGHT_STATUSES.map((status) => {
            const n = counts?.byStatus?.[status] ?? 0;
            if (!n) return null;
            return (
              <span
                key={status}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                  status === 'awarded'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-teal-50 text-teal-700',
                )}
              >
                {n} {STATUS_LABELS_SHORT[status].toLowerCase()}
              </span>
            );
          })}
        </div>
      )}

      <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-gray-400 transition-colors group-hover:text-rmc-green">
        Open board
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

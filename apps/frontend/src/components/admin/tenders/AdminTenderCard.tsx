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
  { deadline: string; hoverBorder: string; titleHover: string }
> = {
  open: {
    deadline: 'bg-rmc-green/10 text-rmc-green',
    hoverBorder: 'hover:border-rmc-green/30',
    titleHover: 'group-hover:text-rmc-green',
  },
  closing: {
    deadline: 'bg-amber-50 text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    titleHover: 'group-hover:text-amber-600',
  },
  closed: {
    deadline: 'bg-gray-100 text-gray-400',
    hoverBorder: 'hover:border-gray-300',
    titleHover: 'group-hover:text-gray-700',
  },
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
        {/* One wrapping meta line instead of three breakpoint-gated groups. The bid
            count and the deadline are the two numbers this row exists to report, and
            they used to vanish below sm — the width where an admin is most likely to be
            triaging from a phone. Wrapping costs a second line on a narrow screen;
            hiding them cost the answer. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
          <span
            className={cn(
              'inline-flex items-center gap-1',
              applied > 0 ? 'text-teal-700' : 'text-gray-400',
            )}
          >
            <Users className="h-3 w-3" />
            {applied} {applied === 1 ? 'bid' : 'bids'}
          </span>

          {/* The deadline carries the lifecycle colour the status chip used to. The chip
              said "Closing soon" directly above a pill reading "3 days left" — the same
              fact twice, in two shapes. The colour is the part that was doing work. */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              styles.deadline,
            )}
          >
            <Clock className="h-3 w-3" />
            {deadlineLabel(tender.expiresAt)}
          </span>

          {attachCount > 0 && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Paperclip className="h-2.5 w-2.5" />
              {attachCount}
            </span>
          )}

          {/* Stage counts sit inline now rather than in an lg-only group. Only the
              decisions, and only once they exist. */}
          {applied > 0 &&
            HIGHLIGHT_STATUSES.map((status) => {
              const n = counts?.byStatus?.[status] ?? 0;
              if (!n) return null;
              return (
                <span
                  key={status}
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px]',
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
      </div>

      <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-[11px] font-semibold text-gray-400 transition-colors group-hover:text-rmc-green">
        <span className="hidden sm:inline">Open board</span>
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

import type { TenderApplicationStatus } from './tenderApplicationApi';
import type { TenderStatusAction } from './tenderApplicationAdminApi';

/**
 * The evaluation pipeline shared by the admin tender board, the applications
 * table and the bid detail page: what each status is called, what the Kanban
 * columns are, and which moves between them the backend will actually accept.
 *
 * The transition rules here MIRROR `adminUpdateStatus` in
 * apps/backend/src/tenders/tenders.service.ts — they exist so the board can grey
 * out a column mid-drag instead of letting the reviewer drop a card and take a
 * 400 back. The backend remains the authority; this is the courtesy copy.
 */

export const STATUS_LABELS: Record<TenderApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  more_info_requested: 'More info requested',
  shortlisted: 'Shortlisted',
  awarded: 'Awarded',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Shorter forms for tight spots — table cells and card badges. */
export const STATUS_LABELS_SHORT: Record<TenderApplicationStatus, string> = {
  ...STATUS_LABELS,
  more_info_requested: 'More info',
};

/**
 * Label for a status that arrives as a bare string — status-history rows carry
 * `fromStatus`/`toStatus` untyped, and an unknown value from an older row should
 * still render as itself rather than blank.
 */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status as TenderApplicationStatus] ?? status;
}

export interface TenderBoardColumn {
  status: TenderApplicationStatus;
  /** Column heading. `awarded` reads as "Winner" on the board — it is the end of the pipeline. */
  label: string;
  /** One line under the heading explaining what belongs in the column. */
  hint: string;
  /** Accent dot beside the heading. */
  dot: string;
  /** Ring + tint applied while a card is hovering over this column as a legal target. */
  dropRing: string;
}

/**
 * Left-to-right order of the pipeline. Every status gets a column — including
 * the two the reviewer cannot drop into (`submitted` has no action that produces
 * it, `withdrawn` is the bidder's own decision) — because a bid that vanished
 * from the board would read as lost rather than as parked.
 */
export const TENDER_BOARD_COLUMNS: TenderBoardColumn[] = [
  {
    status: 'submitted',
    label: 'Submitted',
    hint: 'New bids waiting to be picked up',
    dot: 'bg-blue-500',
    dropRing: 'ring-blue-400 bg-blue-50/60',
  },
  {
    status: 'under_review',
    label: 'Under review',
    hint: 'Being evaluated',
    dot: 'bg-yellow-500',
    dropRing: 'ring-yellow-400 bg-yellow-50/60',
  },
  {
    status: 'more_info_requested',
    label: 'More info',
    hint: 'Waiting on the bidder',
    dot: 'bg-orange-500',
    dropRing: 'ring-orange-400 bg-orange-50/60',
  },
  {
    status: 'shortlisted',
    label: 'Shortlisted',
    hint: 'In the running for the award',
    dot: 'bg-teal-500',
    dropRing: 'ring-teal-400 bg-teal-50/60',
  },
  {
    status: 'awarded',
    label: 'Winner',
    hint: 'Tender awarded',
    dot: 'bg-green-600',
    dropRing: 'ring-green-500 bg-green-50/60',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    hint: 'Closed — cannot be reopened',
    dot: 'bg-red-500',
    dropRing: 'ring-red-400 bg-red-50/60',
  },
  {
    status: 'withdrawn',
    label: 'Withdrawn',
    hint: 'Pulled out by the bidder',
    dot: 'bg-gray-400',
    dropRing: 'ring-gray-300 bg-gray-50',
  },
];

/** Statuses no admin action can produce — nothing may be dropped into them. */
export const UNDROPPABLE_STATUSES: TenderApplicationStatus[] = ['submitted', 'withdrawn'];

/** Statuses the backend refuses to action any further. */
export const TERMINAL_STATUSES: TenderApplicationStatus[] = ['rejected', 'withdrawn'];

/** The action that lands a bid in each target status, where one exists. */
const ACTION_FOR_TARGET: Partial<Record<TenderApplicationStatus, TenderStatusAction>> = {
  under_review: 'start_review',
  more_info_requested: 'request_more_info',
  shortlisted: 'shortlist',
  awarded: 'award',
  rejected: 'reject',
};

export type TenderMoveRule =
  | { allowed: true; action: TenderStatusAction }
  | { allowed: false; reason: string };

/**
 * Whether a bid may move from one column to another, and by which action.
 * The `reason` on a refusal is written to be shown to the reviewer verbatim.
 */
export function tenderMoveRule(
  from: TenderApplicationStatus,
  to: TenderApplicationStatus,
): TenderMoveRule {
  if (from === to) return { allowed: false, reason: 'The bid is already in this column.' };

  if (TERMINAL_STATUSES.includes(from)) {
    return {
      allowed: false,
      reason: `A ${STATUS_LABELS[from].toLowerCase()} bid can no longer be actioned.`,
    };
  }

  if (to === 'submitted') {
    return { allowed: false, reason: 'A bid cannot be sent back to Submitted once review starts.' };
  }

  if (to === 'withdrawn') {
    return { allowed: false, reason: 'Only the bidder can withdraw their own bid.' };
  }

  // The one ordering rule in the pipeline — awarding straight from Submitted
  // would skip evaluation, so the backend requires a shortlisting first.
  if (to === 'awarded' && from !== 'shortlisted') {
    return { allowed: false, reason: 'Shortlist the bid before awarding the tender to it.' };
  }

  const action = ACTION_FOR_TARGET[to];
  if (!action) return { allowed: false, reason: 'That move is not supported.' };

  return { allowed: true, action };
}

/** Pulls the human-readable message out of an axios error from the tender API. */
export function tenderApiError(err: unknown, fallback = 'Something went wrong.'): string {
  const message = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
    ?.response?.data?.error?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || fallback;
}

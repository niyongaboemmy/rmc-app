import type { ScholarshipApplicationStatus } from './scholarshipApi';
import type { ScholarshipStatusAction } from './scholarshipAdminApi';

/**
 * The scholarship review pipeline, in the shape the board needs.
 *
 * Deliberately mirrors `lib/tenderWorkflow.ts` so the two admin boards can be
 * read side by side. The RULES differ because the backend's differ — see
 * `adminUpdateStatus` in scholarship.service.ts, which is the authority. Every
 * refusal below exists because the server would refuse it too; the board just
 * says so before the round trip instead of after it.
 */

export const STATUS_LABELS: Record<ScholarshipApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export interface ScholarshipBoardColumn {
  status: ScholarshipApplicationStatus;
  label: string;
  /** One line under the heading saying what belongs in the column. */
  hint: string;
  dot: string;
  /** Ring + tint while a card hovers over this column as a legal target. */
  dropRing: string;
}

/**
 * Left to right along the pipeline. Every status gets a column, including the
 * three nothing can be dropped into — an application that vanished from the
 * board would read as lost rather than as parked.
 *
 * `draft` is here because a reviewer seeing "3 drafts" learns something real:
 * people started and did not finish. It is not actionable, because the
 * applicant has not submitted yet.
 */
export const SCHOLARSHIP_BOARD_COLUMNS: ScholarshipBoardColumn[] = [
  {
    status: 'draft',
    label: 'Draft',
    hint: 'Started but not submitted',
    dot: 'bg-gray-400',
    dropRing: 'ring-gray-300 bg-gray-50',
  },
  {
    status: 'submitted',
    label: 'Submitted',
    hint: 'Waiting to be picked up',
    dot: 'bg-blue-500',
    dropRing: 'ring-blue-400 bg-blue-50/60',
  },
  {
    status: 'under_review',
    label: 'Under review',
    hint: 'Being assessed',
    dot: 'bg-amber-500',
    dropRing: 'ring-amber-400 bg-amber-50/60',
  },
  {
    status: 'approved',
    label: 'Approved',
    hint: 'Offered — awaiting confirmation',
    dot: 'bg-green-500',
    dropRing: 'ring-green-400 bg-green-50/60',
  },
  {
    status: 'confirmed',
    label: 'Confirmed',
    hint: 'Award accepted',
    dot: 'bg-violet-500',
    dropRing: 'ring-violet-400 bg-violet-50/60',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    hint: 'Declined, with a reason',
    dot: 'bg-red-500',
    dropRing: 'ring-red-400 bg-red-50/60',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    hint: 'Withdrawn by the applicant',
    dot: 'bg-gray-300',
    dropRing: 'ring-gray-300 bg-gray-50',
  },
];

/** Statuses no admin action produces — nothing may be dropped in. */
export const UNDROPPABLE_STATUSES: ScholarshipApplicationStatus[] = [
  'draft',
  'submitted',
  'cancelled',
];

/** Statuses the board will not action further. */
export const TERMINAL_STATUSES: ScholarshipApplicationStatus[] = ['rejected', 'cancelled'];

/** The action that lands an application in each target status. */
const ACTION_FOR_TARGET: Partial<
  Record<ScholarshipApplicationStatus, ScholarshipStatusAction>
> = {
  under_review: 'start_review',
  approved: 'approve',
  confirmed: 'confirm',
  rejected: 'reject',
};

export type ScholarshipMoveRule =
  | { allowed: true; action: ScholarshipStatusAction }
  | { allowed: false; reason: string };

/**
 * Whether an application may move between two columns, and by which action.
 * `reason` is written to be shown to the reviewer verbatim.
 */
export function scholarshipMoveRule(
  from: ScholarshipApplicationStatus,
  to: ScholarshipApplicationStatus,
): ScholarshipMoveRule {
  if (from === to) return { allowed: false, reason: 'It is already in this column.' };

  if (TERMINAL_STATUSES.includes(from)) {
    return {
      allowed: false,
      reason: `A ${STATUS_LABELS[from].toLowerCase()} application can no longer be actioned.`,
    };
  }

  if (from === 'draft') {
    return {
      allowed: false,
      reason: 'The applicant has not submitted this yet — there is nothing to review.',
    };
  }

  if (to === 'draft' || to === 'submitted') {
    return { allowed: false, reason: 'An application cannot be sent back once review starts.' };
  }

  if (to === 'cancelled') {
    return { allowed: false, reason: 'Only the applicant can withdraw their own application.' };
  }

  // The ordering the backend enforces. Stated here so the reviewer is told
  // BEFORE the request, and in words rather than a 400.
  if (to === 'under_review' && from !== 'submitted') {
    return { allowed: false, reason: 'Only a submitted application can start review.' };
  }
  if (to === 'approved' && from !== 'under_review') {
    return { allowed: false, reason: 'Start the review before approving it.' };
  }
  if (to === 'confirmed' && from !== 'approved') {
    return { allowed: false, reason: 'Only an approved application can be confirmed.' };
  }

  const action = ACTION_FOR_TARGET[to];
  if (!action) return { allowed: false, reason: 'That move is not supported.' };

  return { allowed: true, action };
}

/** Pulls the readable message out of an axios error from the scholarship API. */
export function scholarshipApiError(err: unknown, fallback = 'Something went wrong.'): string {
  const message = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
    ?.response?.data?.error?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || fallback;
}

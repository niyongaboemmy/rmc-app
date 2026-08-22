import type { JobApplicationStatus } from './jobsApi';
import type { JobStatusAction } from './jobsAdminApi';

/**
 * The evaluation pipeline shared by the admin job board, the applications table
 * and the application detail page: what each status is called, what the Kanban
 * columns are, and which moves between them the backend will accept.
 *
 * Mirrors `adminUpdateStatus` in
 * apps/backend/src/job-applications/job-applications.service.ts. The backend
 * remains the authority; this is the courtesy copy so the board can grey out an
 * illegal target mid-drag instead of letting the reviewer take a 400 back.
 *
 * Modelled on the Tenders pipeline (lib/tenderWorkflow.ts): `accepted` plays the
 * role of the tender's `awarded`, and `cancelled` the role of `withdrawn`.
 */

export const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  more_info_requested: 'More info requested',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** Shorter forms for tight spots — table cells and card badges. */
export const STATUS_LABELS_SHORT: Record<JobApplicationStatus, string> = {
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
  return STATUS_LABELS[status as JobApplicationStatus] ?? status;
}

export interface JobBoardColumn {
  status: JobApplicationStatus;
  /** Column heading. */
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
 * it, `cancelled` is the applicant's own decision) — because an application that
 * vanished from the board would read as lost rather than as parked.
 */
export const JOB_BOARD_COLUMNS: JobBoardColumn[] = [
  {
    status: 'submitted',
    label: 'Submitted',
    hint: 'New applications waiting to be picked up',
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
    hint: 'Waiting on the applicant',
    dot: 'bg-orange-500',
    dropRing: 'ring-orange-400 bg-orange-50/60',
  },
  {
    status: 'shortlisted',
    label: 'Shortlisted',
    hint: 'In the running for the role',
    dot: 'bg-teal-500',
    dropRing: 'ring-teal-400 bg-teal-50/60',
  },
  {
    status: 'accepted',
    label: 'Accepted',
    hint: 'Offer accepted — hired',
    dot: 'bg-green-600',
    dropRing: 'ring-green-500 bg-green-50/60',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    hint: 'Closed — not moving forward',
    dot: 'bg-red-500',
    dropRing: 'ring-red-400 bg-red-50/60',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    hint: 'Withdrawn by the applicant',
    dot: 'bg-gray-400',
    dropRing: 'ring-gray-300 bg-gray-50',
  },
];

/** Statuses no admin action can produce — nothing may be dropped into them. */
export const UNDROPPABLE_STATUSES: JobApplicationStatus[] = ['submitted', 'cancelled'];

/** Statuses the board will not action any further. */
export const TERMINAL_STATUSES: JobApplicationStatus[] = ['rejected', 'cancelled'];

/** The action that lands an application in each target status, where one exists. */
const ACTION_FOR_TARGET: Partial<Record<JobApplicationStatus, JobStatusAction>> = {
  under_review: 'start_review',
  more_info_requested: 'request_more_info',
  shortlisted: 'shortlist',
  accepted: 'accept',
  rejected: 'reject',
};

export type JobMoveRule =
  | { allowed: true; action: JobStatusAction }
  | { allowed: false; reason: string };

/**
 * Whether an application may move from one column to another, and by which
 * action. The `reason` on a refusal is written to be shown to the reviewer
 * verbatim.
 */
export function jobMoveRule(
  from: JobApplicationStatus,
  to: JobApplicationStatus,
): JobMoveRule {
  if (from === to) return { allowed: false, reason: 'The application is already in this column.' };

  if (TERMINAL_STATUSES.includes(from)) {
    return {
      allowed: false,
      reason: `A ${STATUS_LABELS[from].toLowerCase()} application can no longer be actioned.`,
    };
  }

  if (to === 'submitted') {
    return { allowed: false, reason: 'An application cannot be sent back to Submitted once review starts.' };
  }

  if (to === 'cancelled') {
    return { allowed: false, reason: 'Only the applicant can cancel their own application.' };
  }

  const action = ACTION_FOR_TARGET[to];
  if (!action) return { allowed: false, reason: 'That move is not supported.' };

  return { allowed: true, action };
}

/** Pulls the human-readable message out of an axios error from the job API. */
export function jobApiError(err: unknown, fallback = 'Something went wrong.'): string {
  const message = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
    ?.response?.data?.error?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || fallback;
}

/**
 * The documents a reviewer can ask a job applicant to (re-)upload.
 *
 * Mirrors REQUESTABLE_JOB_DOCUMENTS in the backend
 * (apps/backend/src/job-applications/requestable-documents.ts), which VALIDATES what the
 * API accepts — keep the two lists in step. The keys match the slots on
 * `JobApplicationDocuments`, so a request names a real place the file will land; the
 * labels are the same words the detail page already uses for those documents, so a
 * reviewer ticking "Criminal record" and an applicant reading it see one name for it.
 */
export const REQUESTABLE_JOB_DOCUMENTS: { key: string; label: string }[] = [
  { key: 'applicationLetter', label: 'Application letter' },
  { key: 'cv', label: 'Curriculum Vitae (CV)' },
  { key: 'nationalId', label: 'National ID' },
  { key: 'criminalRecord', label: 'Criminal record' },
  { key: 'academicPapers', label: 'Academic papers' },
  { key: 'goodConductCertificate', label: 'Good conduct certificate' },
  { key: 'employerRecommendation', label: 'Employer recommendation' },
  { key: 'other', label: 'Something else (described in the message)' },
];

/** Label for a requested-document key, falling back to the key when unknown. */
export function requestedDocumentLabel(key: string): string {
  return REQUESTABLE_JOB_DOCUMENTS.find((d) => d.key === key)?.label ?? key;
}

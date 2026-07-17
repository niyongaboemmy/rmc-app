/**
 * Discussions tunables — in one place, not scattered as literals.
 *
 * These WILL be tuned against real traffic, and hunting a magic `3` across the codebase
 * at that point is misery. Plan §6.1. (A future admin-settings surface can override these;
 * for Phase B they are constants.)
 */
export const DISCUSSION_LIMITS = {
  /** Eligible reports that auto-hide a post. 3 is a small conspiracy for a few-hundred-
   *  member community — RMC may want 5 (plan §10-Q3). */
  REPORT_AUTOHIDE_THRESHOLD: 3,

  /** Below this account age a report is FILED but does not count toward the threshold —
   *  otherwise three throwaway accounts silence anything. */
  REPORT_MIN_ACCOUNT_AGE_DAYS: 7,

  /** A human asking a 6th question in an hour is not asking questions. Per user. */
  MAX_QUESTIONS_PER_HOUR: 5,

  /** Reporting is a weapon too. Per user. */
  MAX_REPORTS_PER_HOUR: 10,

  /** Answering is legitimately faster than asking. Per user. */
  MAX_ANSWERS_PER_HOUR: 20,

  /** Voting is cheap; the cap is just an anti-script backstop. Per user. */
  MAX_VOTES_PER_HOUR: 60,

  /** After this an answer is frozen — a published answer others may have acted on must
   *  not shift under them. */
  ANSWER_EDIT_WINDOW_MIN: 15,

  /** New accounts cannot post — blunt, but effective against drive-by spam. */
  NEW_ACCOUNT_POST_DELAY_HOURS: 24,

  /** A one-word "question" is noise. */
  MIN_TITLE_LENGTH: 10,
  MIN_BODY_LENGTH: 20,
} as const;

/** Reasons a member may cite when reporting. Kept short and closed — a free-text-only
 *  report is harder to triage and easier to abuse. */
export const REPORT_REASONS = ['spam', 'offensive', 'misinformation', 'off_topic', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

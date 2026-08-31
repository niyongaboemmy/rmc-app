/**
 * Discussions tunables — in one place, not scattered as literals.
 *
 * These WILL be tuned against real traffic, and hunting a magic `3` across the codebase
 * at that point is misery. (A future admin-settings surface can override these; for now
 * they are constants.)
 *
 * Everything here now governs ASKING, because asking is the only thing a member does in
 * this feature. The thresholds that governed answering, voting and reporting went with
 * the community-forum model they belonged to — see migration 064.
 */
export const DISCUSSION_LIMITS = {
  /** A human asking a 6th question in an hour is not asking questions. Per user. */
  MAX_QUESTIONS_PER_HOUR: 5,

  /** New accounts cannot post — blunt, but effective against drive-by spam. */
  NEW_ACCOUNT_POST_DELAY_HOURS: 24,

  /** A one-word "question" is noise. */
  MIN_TITLE_LENGTH: 10,
  MIN_BODY_LENGTH: 20,
} as const;

/**
 * How many "related questions" a detail page offers, and the hard ceiling on what the
 * endpoint will return however it is asked.
 *
 * Three. A short list of next steps is a suggestion the reader can take in at a glance;
 * a long one is a second index competing with the answer they came for.
 */
export const RELATED_LIMIT = 3;

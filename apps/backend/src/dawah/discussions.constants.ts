/**
 * Discussions tunables — in one place, not scattered as literals.
 *
 * These WILL be tuned against real traffic, and hunting a magic `3` across the codebase
 * at that point is misery. (A future admin-settings surface can override these; for now
 * they are constants.)
 *
 * Most of these govern ASKING, because asking is the only thing a member does in this
 * feature. The thresholds that governed voting and reporting went with the community-forum
 * model they belonged to — see migration 064. What remains on the answering side is a
 * length ceiling, below.
 */
export const DISCUSSION_LIMITS = {
  /** A human asking a 6th question in an hour is not asking questions. Per user. */
  MAX_QUESTIONS_PER_HOUR: 5,

  /** New accounts cannot post — blunt, but effective against drive-by spam. */
  NEW_ACCOUNT_POST_DELAY_HOURS: 24,

  /** A one-word "question" is noise. */
  MIN_TITLE_LENGTH: 10,
  MIN_BODY_LENGTH: 20,

  /**
   * How long an ADMIN-authored question or answer may be.
   *
   * Was 20,000 — about 3,000 words — which sounds generous until a scholar writes a
   * ruling that sets out the evidence and cites its sources, and loses the lot to a
   * validation error. The column is `text`, so nothing in the database wanted this;
   * it was only ever the DTO's opinion.
   *
   * 200,000 is roughly 30,000 words. The real ceiling is the 2 MB JSON body limit in
   * main.ts, and this stays well inside it even for Arabic, which is two bytes per
   * character in UTF-8 (~400 kB) — with room for the rest of the payload. It is still
   * a bound rather than no bound: an unlimited text field is a way to fill a table.
   */
  MAX_ADMIN_BODY_LENGTH: 200_000,

  /**
   * The same ceiling for a MEMBER's submitted question, which is far lower on purpose.
   * That route is @Public() and rate-limited but unauthenticated, so its body size is
   * an abuse surface in a way an admin's is not. 20,000 characters is more than anyone
   * needs to ask a question.
   */
  MAX_MEMBER_BODY_LENGTH: 20_000,
} as const;

/**
 * How many "related questions" a detail page offers, and the hard ceiling on what the
 * endpoint will return however it is asked.
 *
 * Three. A short list of next steps is a suggestion the reader can take in at a glance;
 * a long one is a second index competing with the answer they came for.
 */
export const RELATED_LIMIT = 3;

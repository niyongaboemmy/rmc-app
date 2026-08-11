/**
 * How far a submission deadline is from now — the single rule behind every
 * "closes in N days" chip, countdown, and status colour.
 *
 * Replaces a `Math.ceil((expiresAt - Date.now()) / DAY)` helper that had been
 * copy-pasted into each board. That rule was wrong twice over:
 *
 *  - **A lapsed deadline read as open.** Ceil returns 0 for a deadline that
 *    expired earlier the same day, which every caller rendered as "Closes
 *    today". On the tender detail page that also un-hid the Apply button, so a
 *    bidder was walked into the 400 that `assertTenderOpen` throws in
 *    `apps/backend/src/tenders/tenders.service.ts` — the exact outcome the
 *    button's own comment says it exists to prevent. The backend compares raw
 *    timestamps; this module now agrees with it.
 *
 *  - **Day counts measured elapsed hours, not dates.** Ceil turns a deadline
 *    five hours away into 1 — "closes tomorrow" — when it closes tonight.
 *    `days` here counts calendar days, so it changes at local midnight the way
 *    a reader glancing at a date expects.
 *
 * Callers must run this client-side: it reads the clock, so computing it during
 * SSR and again on hydration can disagree across a midnight boundary.
 */

const DAY = 86_400_000;

export type DeadlineState = 'none' | 'closed' | 'today' | 'tomorrow' | 'future';

export interface Deadline {
  state: DeadlineState;
  /**
   * Calendar days from today to the deadline's date: 0 today, 1 tomorrow,
   * negative once the date is past. Null only when there is no deadline.
   *
   * Note this is the DATE gap, so it can be 0 on something already closed —
   * a deadline that lapsed this morning. Branch on `closed` first.
   */
  days: number | null;
  /** True once the moment itself has passed. The authority on "can still act". */
  closed: boolean;
}

/** Local midnight, so day counts compare dates rather than elapsed hours. */
function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Read a deadline. An absent or unparseable value is treated as "no deadline",
 * which every board renders as open — a record with no expiry never closes, and
 * a malformed one must not silently close something that is still live.
 */
export function readDeadline(iso: string | null | undefined): Deadline {
  if (!iso) return { state: 'none', days: null, closed: false };

  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return { state: 'none', days: null, closed: false };

  const now = Date.now();
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY);

  if (at <= now) return { state: 'closed', days, closed: true };
  if (days <= 0) return { state: 'today', days: 0, closed: false };
  if (days === 1) return { state: 'tomorrow', days: 1, closed: false };
  return { state: 'future', days, closed: false };
}

export type Lifecycle = 'open' | 'closing' | 'closed';

/**
 * The three-way state that drives card accents on the tender boards: closed,
 * closing (inside a week), or open. A record with no deadline is always open.
 */
export function getLifecycle(iso: string | null | undefined, closingWithinDays = 7): Lifecycle {
  const deadline = readDeadline(iso);
  if (deadline.closed) return 'closed';
  if (deadline.days === null) return 'open';
  return deadline.days <= closingWithinDays ? 'closing' : 'open';
}

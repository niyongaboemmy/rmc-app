/**
 * Classifies the `paymentMethod` a donor chose.
 *
 * This exists because the decision "does a gateway collect this money, or is it
 * already in hand?" used to be a bare `dto.paymentMethod === 'momo'` comparison.
 * Every other value — `'MOMO'`, `'IREMBOPAY'`, `'card'` — fell through to the
 * offline branch and was written straight to `completed`, recording money as
 * received that nobody had been asked for. The literal is replaced by an
 * explicit, case-insensitive classification so an unrecognised value can never
 * again be mistaken for a settled one.
 *
 * ── There is no offline branch any more ──────────────────────────────────────
 *
 * This module used to also carry OFFLINE_DONATION_METHODS — cash, bank, cheque,
 * paypal, other — which the service recorded as already received. RMC collects
 * donations through IremboPay only, so that list described nothing real while
 * remaining reachable: both creation routes are `@Public()`, so posting
 * `paymentMethod: "cash"` was an unauthenticated way to write a completed
 * donation of any amount. It is what produced 19 of the 31 uncharged rows that
 * migration 068 had to sweep.
 *
 * Every accepted method is therefore one a gateway collects. A value that is
 * absent or unrecognised is refused rather than assumed paid — the DTO rejects
 * it at the edge, and DonationsService refuses it again for callers that do not
 * pass through the validation pipe.
 */

/** Methods a payment gateway collects. The donation starts pending. */
export const ONLINE_DONATION_METHODS = ['momo', 'card'] as const;

export type OnlineDonationMethod = (typeof ONLINE_DONATION_METHODS)[number];

/**
 * Values accepted on the wire, before normalisation. `irembopay` is here
 * because the provider name is the obvious thing for a client to send and it
 * plainly means "charge me online" — rejecting it would be pedantic, and
 * silently completing it is the bug this module exists to prevent.
 */
export const ACCEPTED_DONATION_METHODS = [...ONLINE_DONATION_METHODS, 'irembopay'] as const;

/** Wire aliases → the canonical value stored on the donation row. */
const ALIASES: Record<string, string> = {
  irembopay: 'momo',
};

/**
 * Lower-cases, trims and de-aliases. Returns `null` for an absent method, which
 * now means "unspecified" rather than "offline" — the caller refuses it, since
 * there is no longer a method that settles without a gateway.
 */
export function normalizeDonationMethod(raw?: string | null): string | null {
  if (raw === undefined || raw === null) return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  return ALIASES[value] ?? value;
}

/** Whether a gateway must collect this method before the donation counts. */
export function isOnlineDonationMethod(raw?: string | null): boolean {
  const value = normalizeDonationMethod(raw);
  return value !== null && (ONLINE_DONATION_METHODS as readonly string[]).includes(value);
}

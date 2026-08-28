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
 */

/** Methods a payment gateway collects. The donation starts pending. */
export const ONLINE_DONATION_METHODS = ['momo', 'card'] as const;

/** Methods already settled off-platform. The donation is recorded as received. */
export const OFFLINE_DONATION_METHODS = ['cash', 'bank', 'cheque', 'paypal', 'other'] as const;

export type OnlineDonationMethod = (typeof ONLINE_DONATION_METHODS)[number];

/**
 * Values accepted on the wire, before normalisation. `irembopay` is here
 * because the provider name is the obvious thing for a client to send and it
 * plainly means "charge me online" — rejecting it would be pedantic, and
 * silently completing it is the bug this module exists to prevent.
 */
export const ACCEPTED_DONATION_METHODS = [
  ...ONLINE_DONATION_METHODS,
  ...OFFLINE_DONATION_METHODS,
  'irembopay',
] as const;

/** Wire aliases → the canonical value stored on the donation row. */
const ALIASES: Record<string, string> = {
  irembopay: 'momo',
};

/**
 * Lower-cases, trims and de-aliases. Returns `null` for an absent method, which
 * means "not specified" — an admin recording a donation by hand, not an online
 * payment that failed to route.
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

import type { AuthUser } from '@/contexts/AuthContext';

/**
 * Filling a service form from the signed-in account.
 *
 * Every service (tenders, good conduct, scholarships, jobs) asks the same person
 * for the same handful of details it already holds on their account, so each
 * wizard seeds those fields from `useAuth()` instead of making them type it
 * again. Nothing here locks a field: the account is the starting point, and an
 * applicant filing on behalf of someone else just types over it.
 *
 * Seed these in the `useState`/`useForm` initializer, never a post-mount effect
 * — react-hook-form reads `defaultValues` exactly once, at mount, so a value
 * that arrives a render later is silently dropped.
 */

/**
 * Any stored shape (+250781234567, 250781234567, 0781234567) → 0781234567, the
 * local format every service form asks the user to type. Deliberately tolerant:
 * requests carry the API's E.164 while the account profile is edited through a
 * +250-badge input that stores the bare 9-digit national number, and both feed
 * these forms.
 */
export function toLocalRwandanPhone(raw?: string | null): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits ? `0${digits.slice(0, 9)}` : '';
}

/** The account holder's own name, for a "full names" / "contact person" field. */
export function accountFullName(user: AuthUser | null | undefined): string {
  if (!user) return '';
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
}

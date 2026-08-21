// Shared formatting helpers for the public Jobs pages (listing + details).
// Pure functions — no side effects — so cards and the details page stay in sync.

import type { JobPosting } from '@/lib/jobPostingsApi';

/** Localised date, e.g. "12 Aug 2026". Returns '' for empty/invalid input. */
export function formatDate(
  value: string | null | undefined,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, opts);
}

export interface DeadlineInfo {
  /** The deadline has already passed. */
  passed: boolean;
  /** Deadline is within the next 7 days (and not passed). */
  soon: boolean;
  /** Whole days remaining (negative once passed); null when there is no deadline. */
  daysLeft: number | null;
}

/** Classify an application deadline for badges / urgency styling. */
export function deadlineInfo(deadline: string | null | undefined): DeadlineInfo {
  if (!deadline) return { passed: false, soon: false, daysLeft: null };
  const ms = new Date(deadline).getTime();
  if (Number.isNaN(ms)) return { passed: false, soon: false, daysLeft: null };
  const daysLeft = Math.ceil((ms - Date.now()) / 86_400_000);
  return { passed: daysLeft < 0, soon: daysLeft >= 0 && daysLeft <= 7, daysLeft };
}

/** True when the posting was published within the last 14 days. */
export function isRecentlyPosted(value: string | null | undefined): boolean {
  if (!value) return false;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms <= 14 * 86_400_000;
}

/** The date a posting went live (published preferred, else created). */
export function postedDate(p: Pick<JobPosting, 'publishedAt' | 'createdAt'>): string {
  return p.publishedAt ?? p.createdAt;
}

/** A posting is open for applications when live and its deadline hasn't passed. */
export function canApplyTo(p: Pick<JobPosting, 'status' | 'applicationDeadline'>): boolean {
  return p.status === 'open' && !deadlineInfo(p.applicationDeadline).passed;
}

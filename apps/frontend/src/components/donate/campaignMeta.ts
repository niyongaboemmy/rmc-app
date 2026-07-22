/** Whole days left until a campaign's end date, or null if it has no deadline. */
export function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

/** A short human label for a campaign deadline (null = no badge). */
export function deadlineLabel(endDate: string | null): string | null {
  const d = daysLeft(endDate);
  if (d === null) return null;
  if (d < 0) return 'Ended';
  if (d === 0) return 'Ends today';
  if (d === 1) return '1 day left';
  return `${d} days left`;
}

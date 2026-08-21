/**
 * Structured metadata packed into a donation's free-text `message` column.
 *
 *   "niyyah:sadaqah|category:charity|fund:foodbank"
 *
 * The donate page writes it and the admin page reads it (see the frontend's
 * lib/donationMeta.ts) — there are no columns for these. Keys are stable
 * identifiers, never localized labels. This is the read half, needed so a report
 * can carry the category/intention the admin filters and sees on screen.
 *
 * Keep the segment grammar in step with the frontend writer.
 */
export interface DonationMeta {
  niyyah?: string;
  category?: string;
  fund?: string;
}

const SEG_RE = /^(niyyah|category|fund):([A-Za-z0-9_-]+)$/;

/** Tolerant parse — returns {} for legacy/free-text messages. */
export function parseDonationMeta(message?: string | null): DonationMeta {
  const out: DonationMeta = {};
  if (!message) return out;
  for (const seg of message.split('|')) {
    const m = SEG_RE.exec(seg.trim());
    if (m) out[m[1] as keyof DonationMeta] = m[2];
  }
  return out;
}

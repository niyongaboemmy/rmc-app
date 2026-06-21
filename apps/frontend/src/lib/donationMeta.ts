/* ──────────────────────────────────────────────────────────────
   Stable, machine-readable metadata carried in a donation's free-text
   `message` field (Phase 1 — no backend schema change). The donate page
   WRITES it with buildDonationMessage; the admin page READS it with
   parseDonationMeta and re-localizes the keys for display/filtering.

   Format:  "niyyah:sadaqah|category:charity|fund:foodbank"
   Keys are stable identifiers, never localized labels — so admins can
   parse and filter regardless of the donor's language.
   ────────────────────────────────────────────────────────────── */

export interface DonationMeta {
  niyyah?: string;
  category?: string;
  fund?: string;
}

export function buildDonationMessage(m: DonationMeta): string {
  const parts: string[] = [];
  if (m.niyyah) parts.push(`niyyah:${m.niyyah}`);
  if (m.category) parts.push(`category:${m.category}`);
  if (m.fund) parts.push(`fund:${m.fund}`);
  return parts.join('|');
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

/** True when a message actually carries structured metadata. */
export function hasDonationMeta(message?: string | null): boolean {
  const m = parseDonationMeta(message);
  return !!(m.niyyah || m.category || m.fund);
}

/* Minimal shape of a next-intl translator scoped to the `donate` namespace. */
export interface DonateTranslator {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
}

export interface MetaLabels {
  niyyah?: string;
  category?: string;
  fund?: string;
}

/** Resolve stable meta keys to localized labels using the `donate` namespace. */
export function metaLabels(td: DonateTranslator, meta: DonationMeta): MetaLabels {
  const out: MetaLabels = {};

  if (meta.niyyah && td.has(`niyyah.${meta.niyyah}.label`)) {
    out.niyyah = td(`niyyah.${meta.niyyah}.label`);
  }

  if (meta.category === 'general') {
    if (td.has('general.categoryTitle')) out.category = td('general.categoryTitle');
  } else if (meta.category && td.has(`categories.${meta.category}.title`)) {
    out.category = td(`categories.${meta.category}.title`);
  }

  if (meta.fund) {
    if (meta.fund === 'general' && td.has('general.label')) out.fund = td('general.label');
    else if (meta.fund === 'zakat' && td.has('zakatItem.label')) out.fund = td('zakatItem.label');
    else if (meta.category === 'events' && td.has(`events.${meta.fund}.title`)) out.fund = td(`events.${meta.fund}.title`);
    else if (meta.category && td.has(`funds.${meta.category}.${meta.fund}.label`)) out.fund = td(`funds.${meta.category}.${meta.fund}.label`);
  }

  return out;
}

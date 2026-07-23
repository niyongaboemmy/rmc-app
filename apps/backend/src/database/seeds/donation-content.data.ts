/* Seed content for donation categories & sub-funds.
   Intentionally EMPTY: the app ships with no default donate causes — every
   category, sub-fund and program is created by an admin from
   Finance → Donations. Used by 05-donation-content.seed.ts. */

export interface TriText {
  en: string;
  rw: string;
  ar: string;
}
export interface TriList {
  en: string[];
  rw: string[];
  ar: string[];
}

export interface SeedSubFund {
  key: string;
  image: string;
  campaignSlug: string | null;
  sortOrder: number;
  label: TriText;
  long: TriText;
  impact: TriText;
  examples: TriList;
}
export interface SeedCategory {
  key: string;
  icon: string;
  tone: string;
  image: string;
  sortOrder: number;
  title: TriText;
  desc: TriText;
  long: TriText;
  impact: TriText;
  subfunds: SeedSubFund[];
}

export const DONATION_CONTENT: SeedCategory[] = [];

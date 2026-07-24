/* Thin re-export so the donate components depend on a single, local surface for
   the shared funding helpers. */
export { fundedPercent, formatMoney } from '@/components/activities/data';

/** Minimal shape the grid/impact bars need from a live campaign. */
export interface PublicCampaignLike {
  slug: string;
  receivedAmount: number;
  targetAmount: number;
}

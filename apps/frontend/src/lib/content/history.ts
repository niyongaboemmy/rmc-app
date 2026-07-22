import { Tri, tri } from './client';

/**
 * The "RMC Through the Years" section HEADER (heading + accent + subtitle),
 * admin-editable in place on the About page.
 *
 * This is ONLY the section chrome. The timeline ENTRIES (year/title/description/
 * image) are their own records with a dedicated CRUD API (`historyApi`), edited
 * inline too but persisted separately — never CMS copy.
 *
 * It gets its OWN `site_content` section (`about-history`), deliberately NOT the
 * `about` blob: two components writing partial overrides to the same section key
 * would clobber each other's fields on publish.
 *
 * Seeds are the strings previously hard-coded in HistoryTimeline's HEADER map, so
 * the switch to the store is a no-op for every visitor until an admin edits.
 */
export interface HistoryHeaderContent {
  title: Tri;
  accent: Tri;
  subtitle: Tri;
}

export const HISTORY_HEADER_DEFAULT: HistoryHeaderContent = {
  title: tri('RMC Through the', 'RMC Mu Myaka', 'RMC عبر'),
  accent: tri('Years', 'Yacu', 'السنين'),
  subtitle: tri(
    'A journey of faith, community and growth — from the first Muslims in Rwanda to the thriving community of today.',
    'Urugendo rw’ukwemera, umuryango n’iterambere — kuva ku Bayisilamu ba mbere mu Rwanda kugeza ku muryango uteye imbere w’ubu.',
    'رحلة من الإيمان والمجتمع والنمو — من أوائل المسلمين في رواندا إلى مجتمع اليوم المزدهر.',
  ),
};

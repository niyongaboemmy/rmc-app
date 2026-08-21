import { Tri, tri } from './client';

/**
 * The home-page "Open Tenders" teaser section HEADER (title + subtitle).
 *
 * Its OWN `site_content` section, separate from the Tenders page hero
 * (`tenders-hero`): they're the same topic but different placements, and an
 * editor should be able to word the home teaser differently from the page hero.
 * The tender records themselves are API data — never CMS copy.
 *
 * Seeds mirror the `tenders.*` i18n strings the section previously read, so the
 * switch to the store is a no-op for every visitor until an admin edits.
 */
export interface TendersHomeContent {
  title: Tri;
  subtitle: Tri;
}

export const TENDERS_HOME_DEFAULT: TendersHomeContent = {
  title: tri('Open Tenders', "Itangazo ry'Umushinga", 'المناقصات المفتوحة'),
  subtitle: tri(
    'Procurement and contracting opportunities published by Rwanda Muslim Community.',
    "Amahirwe yo gupiganira imishinga yakuwe na Sosiyete y'Abasilamu yo mu Rwanda.",
    'فرص المشتريات والتعاقدات الصادرة عن المجتمع الإسلامي الرواندي.',
  ),
};

import { Tri, tri } from './client';

/**
 * The home-page "News" section HEADER (title + lede).
 *
 * The section itself composes records owned elsewhere: the latest stories come
 * from the Blog & Posts store (`blog`), and the notices panel beside them reads
 * live announcements and tenders from the API under the `announcements`
 * section's own title. Only the section-level copy lives here.
 */
export interface NewsContent {
  title: Tri;
  lede: Tri;
  /** Heading over the latest-stories column. */
  storiesHeading: Tri;
}

export const NEWS_DEFAULT: NewsContent = {
  title: tri('News', 'Amakuru', 'الأخبار'),
  lede: tri(
    'Stories, updates and official notices from the Rwanda Muslim Community.',
    "Inkuru, ibishya n'amatangazo byemewe biturutse mu Muryango w'Abasilamu bo mu Rwanda.",
    'قصص ومستجدات وإعلانات رسمية من المجتمع الإسلامي الرواندي.',
  ),
  storiesHeading: tri('Latest stories', 'Inkuru nshya', 'أحدث القصص'),
};

import { Tri, tri } from './client';

/**
 * The Gallery page HERO (heading + subtitle), admin-editable in place.
 *
 * This is ONLY the hero chrome. The photos, categories and periods are all
 * API-driven records (see galleryApi / GalleryEditBoard) — never CMS copy.
 *
 * Seeds are the strings previously read from the `galleryPage` i18n bundle, so
 * the switch to the store is a no-op for every visitor until an admin edits.
 */
export interface GalleryHeroContent {
  title: Tri;
  subtitle: Tri;
}

export const GALLERY_HERO_DEFAULT: GalleryHeroContent = {
  title: tri('Gallery', 'Galeri', 'المعرض'),
  subtitle: tri(
    'Moments of worship, service, learning, and community life across Rwanda',
    "Ibihe by'amasengesho, serivisi, kwiga, n'imibereho rusange mu Rwanda hose",
    'لحظات من العبادة والخدمة والتعلّم والحياة المجتمعية في جميع أنحاء رواندا',
  ),
};

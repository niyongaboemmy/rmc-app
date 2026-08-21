'use client';

import { useParams } from 'next/navigation';
import { PageHero } from '@/components/layout/PageHero';
import {
  ContentKeys,
  GALLERY_HERO_DEFAULT,
  pick,
  type GalleryHeroContent,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/**
 * Gallery page hero. Renders the shared `PageHero`, but sources its heading and
 * subtitle from the admin-editable `gallery-hero` content section so a
 * super-admin can edit them inline in Edit Mode. Public visitors see the exact
 * same text as before (the section is seeded from the old i18n strings).
 */
export function GalleryHero() {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const { content, editing, setField } = useEditableContent<GalleryHeroContent>(
    ContentKeys.galleryHero,
    GALLERY_HERO_DEFAULT,
  );

  const title = pick(content.title, locale);
  const subtitle = pick(content.subtitle, locale);

  return (
    <PageHero
      minHeightClassName="min-h-[40vh]"
      paddingClassName="pt-28 pb-10"
      title={
        editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={title}
            onCommit={(v) => setField((d) => { d.title[lang] = v; })}
            placeholder="Page title"
          />
        ) : (
          title
        )
      }
      subtitle={
        editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={subtitle}
            onCommit={(v) => setField((d) => { d.subtitle[lang] = v; })}
            placeholder="Page subtitle"
          />
        ) : (
          subtitle
        )
      }
    />
  );
}

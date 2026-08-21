'use client';

import { useParams } from 'next/navigation';
import { PageHero } from './PageHero';
import {
  pick,
  type HeroCopy,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/**
 * A `PageHero` whose eyebrow / title / subtitle come from an admin-editable
 * content section, so a super-admin can edit them inline in Edit Mode. Public
 * visitors see the exact same text as before (each section is seeded from the
 * page's old i18n strings).
 *
 * Drop-in for a static `<PageHero title=... subtitle=... />`: pass the section
 * `contentKey` + its `defaults`, plus any of PageHero's styling props
 * (`ornament`, `minHeightClassName`, …). Set `showEyebrow` to render the eyebrow
 * pill (omit it for heroes that never had one).
 */
export function EditablePageHero({
  contentKey,
  defaults,
  showEyebrow = false,
  ornament = false,
  minHeightClassName,
  paddingClassName,
}: {
  contentKey: string;
  defaults: HeroCopy;
  showEyebrow?: boolean;
  ornament?: boolean;
  minHeightClassName?: string;
  paddingClassName?: string;
}) {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const { content, editing, setField } = useEditableContent<HeroCopy>(contentKey, defaults);

  const eyebrow = pick(content.eyebrow, locale);
  const title = pick(content.title, locale);
  const subtitle = pick(content.subtitle, locale);

  return (
    <PageHero
      ornament={ornament}
      minHeightClassName={minHeightClassName}
      paddingClassName={paddingClassName}
      eyebrow={
        showEyebrow
          ? editing
            ? (
                <InlineText
                  as="span"
                  lang={locale}
                  value={eyebrow}
                  onCommit={(v) => setField((d) => { d.eyebrow[lang] = v; })}
                  placeholder="Eyebrow"
                />
              )
            : eyebrow
          : undefined
      }
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

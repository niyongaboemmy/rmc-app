'use client';

/**
 * Editable copy for the funeral landing page.
 *
 * The page stays a server component — it owns the layout, the hero photo and the
 * section structure. These islands carry only the text, so a super-admin can edit it
 * in place and a visitor sees exactly the markup that was there before.
 *
 * The ayah in the hero is deliberately absent: it is scripture, and the same rule the
 * Hajj Talbiyah already follows. Only its reference line is editable.
 */

import { useParams } from 'next/navigation';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys,
  FUNERAL_DEFAULT,
  isRtl,
  pick,
  raw,
  type FuneralContent,
  type Locale,
} from '@/lib/content-api';

/** Shared plumbing: the merged blob plus the locale bits every island repeats. */
function useFuneralCopy() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<FuneralContent>(
    ContentKeys.funeral,
    FUNERAL_DEFAULT,
  );
  return {
    content,
    editing,
    setField,
    locale,
    lang: locale as Locale,
    dir: isRtl(locale) ? ('rtl' as const) : ('ltr' as const),
  };
}

/** Hero title + standfirst, over the photo. */
export function FuneralHeroCopy() {
  const { content, setField, locale, lang, dir } = useFuneralCopy();
  const copy = content.hero;

  return (
    <>
      <InlineText
        as="h1"
        lang={locale}
        value={pick(copy.title, locale)}
        editValue={raw(copy.title, locale)}
        onCommit={(v) => setField((d) => { d.hero.title[lang] = v; })}
        className="text-3xl font-bold drop-shadow-lg md:text-4xl"
        dir={dir}
        placeholder="Page title"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(copy.subtitle, locale)}
        editValue={raw(copy.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.hero.subtitle[lang] = v; })}
        className="mt-3 max-w-2xl text-base leading-relaxed text-white/75"
        dir={dir}
        placeholder="Short description"
      />
    </>
  );
}

/** The citation under the ayah. The ayah itself is scripture and stays in code. */
export function FuneralAyahRef({ className = '' }: { className?: string }) {
  const { content, setField, locale, lang, dir } = useFuneralCopy();

  return (
    <InlineText
      as="span"
      lang={locale}
      value={pick(content.hero.ayahRef, locale)}
      editValue={raw(content.hero.ayahRef, locale)}
      onCommit={(v) => setField((d) => { d.hero.ayahRef[lang] = v; })}
      className={className}
      dir={dir}
      placeholder="Reference"
    />
  );
}

/** "How can we help?" — the heading above the action cards. */
export function FuneralQuickHeading() {
  const { content, setField, locale, lang, dir } = useFuneralCopy();
  const copy = content.quick;

  return (
    <>
      <InlineText
        as="h2"
        lang={locale}
        value={pick(copy.title, locale)}
        editValue={raw(copy.title, locale)}
        onCommit={(v) => setField((d) => { d.quick.title[lang] = v; })}
        className="text-2xl font-bold text-rmc-green-deep md:text-3xl"
        dir={dir}
        placeholder="Heading"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(copy.subtitle, locale)}
        editValue={raw(copy.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.quick.subtitle[lang] = v; })}
        className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500"
        dir={dir}
        placeholder="Subheading"
      />
    </>
  );
}

/**
 * One action card's title or description. The cards are a fixed pair — their icons
 * and links live in the page — so they are addressed by name, not by index.
 */
export function FuneralActionText({
  card,
  field,
  className = '',
}: {
  card: 'report' | 'cemetery';
  field: 'title' | 'desc';
  className?: string;
}) {
  const { content, setField, locale, lang, dir } = useFuneralCopy();
  const key = `${card}${field === 'title' ? 'Title' : 'Desc'}` as
    | 'reportTitle' | 'reportDesc' | 'cemeteryTitle' | 'cemeteryDesc';

  return (
    <InlineText
      as="span"
      lang={locale}
      value={pick(content.quick[key], locale)}
      editValue={raw(content.quick[key], locale)}
      onCommit={(v) => setField((d) => { d.quick[key][lang] = v; })}
      className={className}
      dir={dir}
      placeholder={field === 'title' ? 'Card title' : 'Card description'}
    />
  );
}

/** The closing "We are here for you" band. */
export function FuneralCtaCopy({
  reportHref,
  contactHref,
}: {
  reportHref: string;
  contactHref: string;
}) {
  const { content, editing, setField, locale, lang, dir } = useFuneralCopy();
  const copy = content.cta;

  const reportCls =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-300 hover:bg-rmc-green-dark';
  const contactCls =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/20';

  return (
    <>
      <InlineText
        as="h2"
        lang={locale}
        value={pick(copy.title, locale)}
        editValue={raw(copy.title, locale)}
        onCommit={(v) => setField((d) => { d.cta.title[lang] = v; })}
        className="text-2xl font-bold text-white md:text-3xl"
        dir={dir}
        placeholder="Heading"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(copy.subtitle, locale)}
        editValue={raw(copy.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.cta.subtitle[lang] = v; })}
        className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70"
        dir={dir}
        placeholder="Supporting line"
      />
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {/* While editing the buttons become text fields — a link would navigate away
            on the click that is meant to place the caret. */}
        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={pick(copy.reportLabel, locale)}
            editValue={raw(copy.reportLabel, locale)}
            onCommit={(v) => setField((d) => { d.cta.reportLabel[lang] = v; })}
            className={reportCls}
            dir={dir}
            placeholder="Button label"
          />
        ) : (
          <a href={reportHref} className={reportCls}>
            {pick(copy.reportLabel, locale)}
          </a>
        )}
        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={pick(copy.contactLabel, locale)}
            editValue={raw(copy.contactLabel, locale)}
            onCommit={(v) => setField((d) => { d.cta.contactLabel[lang] = v; })}
            className={contactCls}
            dir={dir}
            placeholder="Button label"
          />
        ) : (
          <a href={contactHref} className={contactCls}>
            {pick(copy.contactLabel, locale)}
          </a>
        )}
      </div>
    </>
  );
}

/** The cemetery directory page's heading pair. */
export function CemeteryPageHeading() {
  const { content, setField, locale, lang, dir } = useFuneralCopy();
  const copy = content.cemeteries;

  return (
    <>
      <InlineText
        as="h1"
        lang={locale}
        value={pick(copy.title, locale)}
        editValue={raw(copy.title, locale)}
        onCommit={(v) => setField((d) => { d.cemeteries.title[lang] = v; })}
        className="text-2xl font-bold drop-shadow-lg md:text-3xl"
        dir={dir}
        placeholder="Page title"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(copy.subtitle, locale)}
        editValue={raw(copy.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.cemeteries.subtitle[lang] = v; })}
        className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70"
        dir={dir}
        placeholder="Short description"
      />
    </>
  );
}

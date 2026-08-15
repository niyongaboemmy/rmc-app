'use client';

/**
 * Editable copy for the three service board pages (Tenders, Jobs, Scholarships).
 *
 * The pages stay server components — they own the layout, the imagery and the
 * record lists. Only the text is lifted into these islands, so a super-admin can
 * edit it in place in Edit Mode and a visitor sees exactly the markup that was
 * there before.
 *
 * Each island takes the section key + defaults rather than hard-coding one, which
 * is what lets the same three components serve all three boards. The shape they
 * bind to is `ServiceBoardContent`; scholarship passes its wider blob, whose extra
 * `faq`/`cta` fields these simply ignore.
 *
 * Step text is editable; adding and removing steps is NOT. `mergeContent` walks
 * arrays by index, so a removed step would inherit the seeded one at its index and
 * come back — solving that needs the unmerged-read treatment `HajjSteps` documents,
 * and the step count here is structural to each flow rather than something an admin
 * would tune.
 */

import { useParams } from 'next/navigation';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  isRtl,
  pick,
  raw,
  type Locale,
  type ServiceBoardContent,
} from '@/lib/content-api';

interface IslandProps {
  sectionKey: string;
  defaults: ServiceBoardContent;
}

/** Shared plumbing: the merged blob plus the locale bits every island repeats. */
function useBoardCopy(sectionKey: string, defaults: ServiceBoardContent) {
  const { locale } = useParams<{ locale: string }>();
  const { content, setField } = useEditableContent<ServiceBoardContent>(sectionKey, defaults);
  const lang = locale as Locale;
  return {
    content,
    setField,
    locale,
    lang,
    dir: isRtl(locale) ? ('rtl' as const) : ('ltr' as const),
  };
}

/** Hero heading + standfirst. Markup matches what the pages rendered before. */
export function BoardHeroCopy({ sectionKey, defaults }: IslandProps) {
  const { content, setField, locale, lang, dir } = useBoardCopy(sectionKey, defaults);

  return (
    <>
      <InlineText
        as="h1"
        lang={locale}
        value={pick(content.hero.title, locale)}
        editValue={raw(content.hero.title, locale)}
        onCommit={(v) => setField((d) => { d.hero.title[lang] = v; })}
        className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg"
        dir={dir}
        placeholder="Page title"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.hero.subtitle, locale)}
        editValue={raw(content.hero.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.hero.subtitle[lang] = v; })}
        className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed"
        dir={dir}
        placeholder="Short description"
      />
    </>
  );
}

/** The header that sits directly above the list of records. */
export function BoardListHeader({ sectionKey, defaults }: IslandProps) {
  const { content, setField, locale, lang, dir } = useBoardCopy(sectionKey, defaults);

  return (
    <div>
      <InlineText
        as="h2"
        lang={locale}
        value={pick(content.browse.title, locale)}
        editValue={raw(content.browse.title, locale)}
        onCommit={(v) => setField((d) => { d.browse.title[lang] = v; })}
        className="text-xl font-bold text-gray-900"
        dir={dir}
        placeholder="Section heading"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.browse.note, locale)}
        editValue={raw(content.browse.note, locale)}
        onCommit={(v) => setField((d) => { d.browse.note[lang] = v; })}
        className="text-sm text-gray-500 mt-1.5 leading-relaxed"
        dir={dir}
        placeholder="Section note"
      />
    </div>
  );
}

/** The numbered "how to apply" card in the rail. */
export function BoardSteps({ sectionKey, defaults }: IslandProps) {
  const { content, setField, locale, lang, dir } = useBoardCopy(sectionKey, defaults);

  return (
    <ol className="space-y-3">
      {content.steps.items.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-xs font-bold text-white">
            {i + 1}
          </span>
          <div>
            <InlineText
              as="p"
              lang={locale}
              value={pick(step.title, locale)}
              editValue={raw(step.title, locale)}
              onCommit={(v) => setField((d) => { d.steps.items[i].title[lang] = v; })}
              className="text-xs font-semibold text-gray-900"
              dir={dir}
              placeholder="Step title"
            />
            <InlineText
              as="p"
              lang={locale}
              value={pick(step.text, locale)}
              editValue={raw(step.text, locale)}
              onCommit={(v) => setField((d) => { d.steps.items[i].text[lang] = v; })}
              className="text-xs leading-relaxed text-gray-500"
              dir={dir}
              placeholder="Step description"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Heading above {@link BoardSteps}; separate because it sits inside its own icon row. */
export function BoardStepsTitle({ sectionKey, defaults }: IslandProps) {
  const { content, setField, locale, lang, dir } = useBoardCopy(sectionKey, defaults);

  return (
    <InlineText
      as="h3"
      lang={locale}
      value={pick(content.steps.title, locale)}
      editValue={raw(content.steps.title, locale)}
      onCommit={(v) => setField((d) => { d.steps.title[lang] = v; })}
      className="text-sm font-bold text-gray-900"
      dir={dir}
      placeholder="Heading"
    />
  );
}

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
 * Steps can be added, removed and reordered in Edit Mode. That works because
 * `BoardSteps` reads them through `boardSteps()` — the UNMERGED value — rather than
 * the merged blob: `mergeContent` walks arrays by index, so after a deletion the
 * step that shifts up would inherit the seeded step's translations for anything it
 * has not been given. Every mutation writes the whole array back, so the merged copy
 * can never leak in.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import {
  boardSteps,
  getSiteContent,
  isRtl,
  pick,
  raw,
  tri,
  type BoardStep,
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
  const { content, editing, setField } = useEditableContent<ServiceBoardContent>(
    sectionKey,
    defaults,
  );
  const lang = locale as Locale;
  return {
    content,
    editing,
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

/**
 * The numbered "how to apply" card in the rail.
 *
 * Steps are read UNMERGED (see the file header) so an admin can add, remove and
 * reorder them without a deleted step's seeded translations landing on its
 * neighbour.
 */
export function BoardSteps({ sectionKey, defaults }: IslandProps) {
  const { setField, editing, locale, lang, dir } = useBoardCopy(sectionKey, defaults);
  const { bumpSeed } = useEditMode();
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();

  // The raw saved blob, never merged. Seeded from the server value so the first
  // paint is correct without giving up the unmerged invariant.
  const server = useServerSiteContent<ServiceBoardContent>(sectionKey);
  const [saved, setSaved] = useState<ServiceBoardContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);
  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<ServiceBoardContent>(sectionKey)
      .then((data) => {
        if (active && data) setSaved(data);
      })
      .catch(() => {
        /* keep the seeded steps */
      });
    return () => {
      active = false;
    };
  }, [sectionKey, refreshKey]);

  const draft = (store?.getOverride(sectionKey) as ServiceBoardContent | undefined) ?? saved;
  const items = boardSteps(draft, defaults);

  // Every mutation writes the WHOLE array, derived from `items`, so the index-merged
  // copy in `content.steps.items` can never leak back in.
  const writeItems = (next: BoardStep[]) => setField((d) => { d.steps.items = next; });

  const addStep = () =>
    writeItems([...items, { id: `s${Date.now()}`, title: tri(''), text: tri('') }]);

  const removeStep = (i: number) => {
    writeItems(items.filter((_, idx) => idx !== i));
    bumpSeed(); // re-seed the index-keyed inline fields onto their new positions
  };

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    writeItems(next);
    bumpSeed();
  };

  return (
    <>
      <ol className="space-y-3">
        {items.map((step, i) => (
          <li key={step.id} className={`relative flex gap-3 ${editing ? 'pt-1' : ''}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <InlineText
                as="p"
                lang={locale}
                value={pick(step.title, locale)}
                editValue={raw(step.title, locale)}
                onCommit={(v) =>
                  writeItems(items.map((s, idx) => (idx === i ? { ...s, title: { ...s.title, [lang]: v } } : s)))
                }
                className="text-xs font-semibold text-gray-900"
                dir={dir}
                placeholder="Step title"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(step.text, locale)}
                editValue={raw(step.text, locale)}
                onCommit={(v) =>
                  writeItems(items.map((s, idx) => (idx === i ? { ...s, text: { ...s.text, [lang]: v } } : s)))
                }
                className="text-xs leading-relaxed text-gray-500"
                dir={dir}
                placeholder="Step description"
              />
            </div>
            {editing && (
              <CardEditToolbar
                canMoveUp={i > 0}
                canMoveDown={i < items.length - 1}
                onMoveUp={() => moveStep(i, -1)}
                onMoveDown={() => moveStep(i, 1)}
                onDelete={() => removeStep(i)}
                className="!right-0 !top-0 scale-90"
              />
            )}
          </li>
        ))}
      </ol>

      {editing && (
        <button
          type="button"
          onClick={addStep}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-rmc-green hover:text-rmc-green"
        >
          <Plus className="h-3.5 w-3.5" /> Add step
        </button>
      )}
    </>
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

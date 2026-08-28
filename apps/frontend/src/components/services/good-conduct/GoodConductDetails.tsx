'use client';

/**
 * The good-conduct landing page's body: what the certificate is, what you need before
 * applying, and what happens after.
 *
 * The page previously went from its hero straight to two links, so an applicant learned
 * what was required by opening the form and meeting the fields one at a time. These
 * sections say it up front.
 *
 * ── Why the lists are read UNMERGED ─────────────────────────────────────────────────
 *
 * Same reason as the tender/jobs/scholarship boards. `mergeContent` merges arrays BY
 * INDEX, so an admin deleting the second of five requirements would leave the third
 * shifted up wearing the second's seeded translations — copy nobody wrote, on a page
 * telling people what documents to bring. `goodConductRequirements`/`goodConductSteps`
 * take the saved array whole instead, and every mutation writes the WHOLE array back so
 * the index-merged copy can never leak in.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardCheck, ListChecks } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { AddCardTile } from '@/components/edit-mode/AddCardTile';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import { getSiteContent } from '@/lib/content/client';
import {
  ContentKeys,
  GOOD_CONDUCT_DEFAULT,
  goodConductRequirements,
  goodConductSteps,
  pick,
  raw,
  tri,
  type GoodConductContent,
  type GoodConductItem,
  type Tri,
  type Locale,
} from '@/lib/content-api';

export function GoodConductDetails() {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const dir = locale === 'ar' ? ('rtl' as const) : ('ltr' as const);
  const arFont = locale === 'ar' ? 'font-arabic' : '';

  const { content, editing, setField } = useEditableContent<GoodConductContent>(
    ContentKeys.goodConduct,
    GOOD_CONDUCT_DEFAULT,
  );

  // The unmerged read needs the SAVED blob, not the merged one — see the file comment.
  const { bumpSeed } = useEditMode();
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();
  const server = useServerSiteContent<GoodConductContent>(ContentKeys.goodConduct);
  const [saved, setSaved] = useState<GoodConductContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);

  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<GoodConductContent>(ContentKeys.goodConduct)
      .then((data) => { if (active && data) setSaved(data); })
      .catch(() => { /* keep the seeded lists */ });
    return () => { active = false; };
  }, [refreshKey]);

  const draft =
    (store?.getOverride(ContentKeys.goodConduct) as GoodConductContent | undefined) ?? saved;
  const requirements = goodConductRequirements(draft);
  const steps = goodConductSteps(draft);

  /** Whole-array writes, so the index-merged copy cannot leak back in. */
  const write = (key: 'requirements' | 'steps', next: GoodConductItem[]) =>
    setField((d) => { d[key].items = next; });

  const add = (key: 'requirements' | 'steps', list: GoodConductItem[]) =>
    write(key, [...list, { id: `${key}-${Date.now()}`, title: tri(''), text: tri('') }]);

  const remove = (key: 'requirements' | 'steps', list: GoodConductItem[], i: number) => {
    write(key, list.filter((_, idx) => idx !== i));
    // Re-seed the index-keyed inline boxes, or the field below the deleted one keeps
    // showing the text that just moved out of it.
    bumpSeed();
  };

  const move = (key: 'requirements' | 'steps', list: GoodConductItem[], i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    write(key, next);
    bumpSeed();
  };

  /** An inline-editable field on one list entry. */
  const itemField = (
    key: 'requirements' | 'steps',
    list: GoodConductItem[],
    i: number,
    field: 'title' | 'text',
    className: string,
    placeholder: string,
  ) => (
    <InlineText
      as={field === 'title' ? 'p' : 'span'}
      lang={locale}
      value={pick(list[i][field], locale)}
      // This locale's OWN text, so an untranslated entry opens empty rather than
      // pre-filled with the English it falls back to.
      editValue={raw(list[i][field], locale)}
      onCommit={(v) =>
        write(
          key,
          list.map((entry, idx) =>
            idx === i ? { ...entry, [field]: { ...entry[field], [lang]: v } } : entry,
          ),
        )
      }
      dir={dir}
      className={className}
      placeholder={placeholder}
    />
  );

  /**
   * A section heading. Takes the Tri and its writer rather than a group/field pair —
   * `steps` has no `lede`, so addressing them by key needs a cast that defeats the
   * point of having the type.
   */
  const heading = (value: Tri, commit: (d: GoodConductContent, v: string) => void, placeholder: string) => (
    <InlineText
      as="span"
      lang={locale}
      value={pick(value, locale)}
      editValue={raw(value, locale)}
      onCommit={(v) => setField((d) => commit(d, v))}
      dir={dir}
      placeholder={placeholder}
    />
  );

  return (
    <>
      {/* ── About ─────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-14 px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-3xl ${arFont}`} dir={dir}>
          <InlineText
            as="p"
            lang={locale}
            value={pick(content.about.eyebrow, locale)}
            editValue={raw(content.about.eyebrow, locale)}
            onCommit={(v) => setField((d) => { d.about.eyebrow[lang] = v; })}
            dir={dir}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
            placeholder="Eyebrow"
          />
          <InlineText
            as="h2"
            lang={locale}
            value={pick(content.about.title, locale)}
            editValue={raw(content.about.title, locale)}
            onCommit={(v) => setField((d) => { d.about.title[lang] = v; })}
            dir={dir}
            className="mt-1.5 text-2xl font-bold text-rmc-green-deep md:text-3xl"
            placeholder="Heading"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(content.about.body, locale)}
            editValue={raw(content.about.body, locale)}
            onCommit={(v) => setField((d) => { d.about.body[lang] = v; })}
            dir={dir}
            className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base"
            placeholder="Description"
          />
        </div>
      </section>

      {/* ── Before you apply ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50/60 py-14 px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-3xl ${arFont}`} dir={dir}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green-dark">
              <ClipboardCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-xl font-bold text-rmc-green-deep md:text-2xl">
              {heading(content.requirements.title, (d, v) => { d.requirements.title[lang] = v; }, 'Heading')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {heading(content.requirements.lede, (d, v) => { d.requirements.lede[lang] = v; }, 'Intro line')}
          </p>

          <ol className="mt-6 space-y-3">
            {requirements.map((req, i) => (
              <li
                key={req.id ?? i}
                className="relative flex gap-3.5 rounded-lg border border-gray-200/70 bg-white p-4"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rmc-green text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {itemField('requirements', requirements, i, 'title',
                    'text-sm font-semibold text-gray-900', 'What is needed')}
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {itemField('requirements', requirements, i, 'text', '', 'Why, or what form it takes')}
                  </p>
                </div>
                {editing && (
                  <CardEditToolbar
                    canMoveUp={i > 0}
                    canMoveDown={i < requirements.length - 1}
                    onMoveUp={() => move('requirements', requirements, i, -1)}
                    onMoveDown={() => move('requirements', requirements, i, 1)}
                    onDelete={() => remove('requirements', requirements, i)}
                    className="!right-1 !top-1 scale-90"
                  />
                )}
              </li>
            ))}
          </ol>

          {editing && (
            <AddCardTile
              label="Add a requirement"
              onClick={() => add('requirements', requirements)}
              className="mt-3"
            />
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-14 px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto max-w-3xl ${arFont}`} dir={dir}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green-dark">
              <ListChecks className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-xl font-bold text-rmc-green-deep md:text-2xl">
              {heading(content.steps.title, (d, v) => { d.steps.title[lang] = v; }, 'Heading')}
            </h2>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.id ?? i}
                className="relative rounded-lg border border-gray-200/70 bg-gray-50/60 p-4"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-rmc-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {itemField('steps', steps, i, 'title',
                  'mt-1 text-sm font-semibold text-gray-900', 'Step')}
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {itemField('steps', steps, i, 'text', '', 'What happens')}
                </p>
                {editing && (
                  <CardEditToolbar
                    canMoveUp={i > 0}
                    canMoveDown={i < steps.length - 1}
                    onMoveUp={() => move('steps', steps, i, -1)}
                    onMoveDown={() => move('steps', steps, i, 1)}
                    onDelete={() => remove('steps', steps, i)}
                    className="!right-1 !top-1 scale-90"
                  />
                )}
              </li>
            ))}
          </ol>

          {editing && (
            <AddCardTile label="Add a step" onClick={() => add('steps', steps)} className="mt-3" />
          )}
        </div>
      </section>
    </>
  );
}

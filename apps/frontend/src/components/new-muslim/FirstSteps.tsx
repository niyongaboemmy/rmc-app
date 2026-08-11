'use client';

/**
 * Section: "Your first steps as a Muslim" — the ordered things a new Muslim can
 * do next. Cards are admin-managed: add, reorder, delete and re-icon them in
 * place in Edit Mode.
 *
 * The card list is read UNMERGED (`useSavedNewMuslim` + `newMuslimSteps`) rather
 * than from the merged content — see the note on `useSavedNewMuslim`.
 */

import { newMuslimSteps, pick, tri, type NewMuslimStep } from '@/lib/content-api';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { AddCardTile } from '@/components/edit-mode/AddCardTile';
import {
  IconChip, InlineSelect, SectionHeading, STEP_ICON_OPTIONS, stepIcon,
  useNewMuslimCopy, useSavedNewMuslim,
} from './shared';

export function FirstSteps() {
  const { locale, lang, dir, arabicFont, content, editing, setField } = useNewMuslimCopy();
  const { bumpSeed } = useEditMode();
  const items = newMuslimSteps(useSavedNewMuslim());

  // Every mutation writes the WHOLE array derived from `items`, so the
  // index-merged copy in `content.steps.items` can never leak back in.
  const writeItems = (next: NewMuslimStep[]) => setField((d) => { d.steps.items = next; });

  const setStep = (i: number, patch: (step: NewMuslimStep) => NewMuslimStep) =>
    writeItems(items.map((s, idx) => (idx === i ? patch(s) : s)));

  const addStep = () =>
    writeItems([
      ...items,
      { id: `step-${Date.now()}`, icon: 'Sparkles', title: tri(''), description: tri('') },
    ]);

  const removeStep = (i: number) => {
    writeItems(items.filter((_, idx) => idx !== i));
    bumpSeed(); // re-seed the index-keyed inline fields onto their new positions
  };

  const moveStep = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    writeItems(next);
    bumpSeed();
  };

  if (!items.length && !editing) return null;

  return (
    <section id="first-steps" className="scroll-mt-24 bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading
          heading={content.steps}
          locale={locale}
          dir={dir}
          arabicFont={arabicFont}
          onEyebrow={(v) => setField((d) => { d.steps.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.steps.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.steps.subtitle[lang] = v; })}
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {items.map((step, i) => {
            const Icon = stepIcon(step.icon);
            return (
              <div
                key={step.id}
                dir={dir}
                // While editing the card must NOT clip or transform: `overflow-hidden`
                // would cut off the icon picker's popover, and the hover lift's
                // transform would trap it in the card's stacking context, under the
                // card below. Same trade-off as the Areas pillar cards.
                className={`relative flex gap-5 rounded-lg border border-gray-200/70 bg-white p-6 shadow-sm ${
                  editing
                    ? 'overflow-visible'
                    : 'overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md'
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg pattern-light opacity-60"
                  aria-hidden
                />

                <div className="relative flex shrink-0 flex-col items-center">
                  <IconChip icon={Icon} />
                  {editing && (
                    <InlineSelect
                      value={step.icon}
                      options={STEP_ICON_OPTIONS}
                      onChange={(v) => setStep(i, (s) => ({ ...s, icon: v }))}
                      aria-label="Choose step icon"
                      className="mt-3"
                    />
                  )}
                </div>

                <div className={`relative min-w-0 ${arabicFont}`}>
                  {editing && (
                    <CardEditToolbar
                      canMoveUp={i > 0}
                      canMoveDown={i < items.length - 1}
                      onMoveUp={() => moveStep(i, -1)}
                      onMoveDown={() => moveStep(i, 1)}
                      onDelete={() => removeStep(i)}
                    />
                  )}
                  <InlineText
                    as="h3"
                    lang={locale}
                    dir={dir}
                    value={pick(step.title, locale)}
                    onCommit={(v) => setStep(i, (s) => ({ ...s, title: { ...s.title, [lang]: v } }))}
                    className={`text-lg font-bold text-gray-900 ${editing ? 'pe-24' : ''}`}
                    placeholder="Step title"
                  />
                  <InlineText
                    as="p"
                    lang={locale}
                    dir={dir}
                    value={pick(step.description, locale)}
                    onCommit={(v) =>
                      setStep(i, (s) => ({ ...s, description: { ...s.description, [lang]: v } }))
                    }
                    className="mt-2 text-sm leading-relaxed text-gray-500"
                    placeholder="Step description"
                  />
                </div>
              </div>
            );
          })}

          {editing && <AddCardTile label="Add step" onClick={addStep} />}
        </div>
      </div>
    </section>
  );
}

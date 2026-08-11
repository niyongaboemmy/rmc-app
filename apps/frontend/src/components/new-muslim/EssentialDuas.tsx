'use client';

/**
 * Section: "Duas to begin with" — the short supplications a new Muslim most
 * often wants on hand. Rendered as the page's one dark band so the Arabic is the
 * thing the eye lands on.
 *
 * The Arabic and its transliteration are single strings, NOT `Tri`: they read the
 * same in every locale. Only the meaning is translated. Cards are admin-managed
 * (add / reorder / delete) and read unmerged — see `useSavedNewMuslim`.
 */

import { newMuslimDuas, pick, tri, type NewMuslimDua } from '@/lib/content-api';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { AddCardTile } from '@/components/edit-mode/AddCardTile';
import { SectionHeading, useNewMuslimCopy, useSavedNewMuslim } from './shared';

export function EssentialDuas() {
  const { locale, lang, dir, arabicFont, content, editing, setField } = useNewMuslimCopy();
  const { bumpSeed } = useEditMode();
  const items = newMuslimDuas(useSavedNewMuslim());

  const writeItems = (next: NewMuslimDua[]) => setField((d) => { d.duas.items = next; });

  const setDua = (i: number, patch: (dua: NewMuslimDua) => NewMuslimDua) =>
    writeItems(items.map((x, idx) => (idx === i ? patch(x) : x)));

  const addDua = () =>
    writeItems([
      ...items,
      { id: `dua-${Date.now()}`, arabic: '', transliteration: '', meaning: tri('') },
    ]);

  const removeDua = (i: number) => {
    writeItems(items.filter((_, idx) => idx !== i));
    bumpSeed();
  };

  const moveDua = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    writeItems(next);
    bumpSeed();
  };

  if (!items.length && !editing) return null;

  return (
    <section id="duas" className="scroll-mt-24 bg-rmc-green-deep py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading
          heading={content.duas}
          locale={locale}
          dir={dir}
          arabicFont={arabicFont}
          tone="dark"
          onEyebrow={(v) => setField((d) => { d.duas.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.duas.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.duas.subtitle[lang] = v; })}
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          {items.map((dua, i) => (
            <div
              key={dua.id}
              className="relative rounded-lg border border-white/10 p-7 text-center"
            >
              {editing && (
                <CardEditToolbar
                  canMoveUp={i > 0}
                  canMoveDown={i < items.length - 1}
                  onMoveUp={() => moveDua(i, -1)}
                  onMoveDown={() => moveDua(i, 1)}
                  onDelete={() => removeDua(i)}
                />
              )}

              {/* Arabic and transliteration are locale-independent, so they carry
                  no `lang` seed — editing them changes the card for everyone. */}
              <InlineText
                as="p"
                dir="rtl"
                value={dua.arabic}
                onCommit={(v) => setDua(i, (x) => ({ ...x, arabic: v }))}
                className="font-arabic text-2xl leading-loose text-rmc-gold-light md:text-3xl"
                placeholder="Arabic"
              />
              <InlineText
                as="p"
                value={dua.transliteration}
                onCommit={(v) => setDua(i, (x) => ({ ...x, transliteration: v }))}
                className="mt-4 text-sm italic text-white/70"
                placeholder="Transliteration"
              />
              <InlineText
                as="p"
                lang={locale}
                dir={dir}
                value={pick(dua.meaning, locale)}
                onCommit={(v) =>
                  setDua(i, (x) => ({ ...x, meaning: { ...x.meaning, [lang]: v } }))
                }
                className={`mt-2 text-sm leading-relaxed text-white/85 ${arabicFont}`}
                placeholder="Meaning"
              />
            </div>
          ))}

          {editing && (
            <AddCardTile
              label="Add dua"
              onClick={addDua}
              className="border-rmc-gold/30 bg-white/[0.04] text-rmc-gold-light/80 hover:border-rmc-gold/60 hover:bg-white/[0.08] hover:text-rmc-gold-light"
            />
          )}
        </div>
      </div>
    </section>
  );
}

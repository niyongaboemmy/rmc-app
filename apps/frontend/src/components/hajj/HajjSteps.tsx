'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Plus } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import {
  ContentKeys, getSiteContent, pick, isRtl, tri,
  hajjSteps, HAJJ_DEFAULT, type HajjContent, type HajjStep, type Locale,
} from '@/lib/content-api';
import { requirementIcon } from './requirementIcons';

/**
 * Section: "How it works" — the ordered journey, shown after the requirements
 * checklist. Both the heading and the steps themselves are admin-managed
 * (Content → Hajj Service) and editable in place in Edit Mode.
 *
 * Renders nothing once an admin removes every step — except while editing, where
 * an empty section still has to offer a way back in.
 *
 * ── Why the steps are read separately from the heading ──────────────────────
 * `useEditableContent` merges saved content over the seeded defaults, and that
 * merge walks arrays BY INDEX. For the heading that is exactly right. For the
 * steps it is not: a deleted step would inherit the seeded step that used to sit
 * at its index and reappear on the page. `hajjSteps()` exists for this reason
 * (see its own comment) and takes the UNMERGED value, so that is what is read
 * here — the live draft when one exists, otherwise what the CMS returned.
 */
export function HajjSteps() {
  const locale = useLocale();
  const lang = locale as Locale;
  const rtl = isRtl(locale);
  const dir = rtl ? 'rtl' : 'ltr';

  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );
  const { bumpSeed } = useEditMode();
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();

  const heading = content.steps;

  // The raw saved blob, never merged — see the header note. Deliberately NOT
  // `usePreviewableContent`, which merges: seeded step translations would graft onto
  // steps an admin has replaced. Seeding from the server value keeps the first paint
  // correct without giving that invariant up.
  const server = useServerSiteContent<HajjContent>(ContentKeys.hajj);
  const [saved, setSaved] = useState<HajjContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);
  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<HajjContent>(ContentKeys.hajj)
      .then((data) => { if (active && data) setSaved(data); })
      .catch(() => { /* keep the seeded steps */ });
    return () => { active = false; };
  }, [refreshKey]);

  const draft = (store?.getOverride(ContentKeys.hajj) as HajjContent | undefined) ?? saved;
  const items = hajjSteps(draft);

  // Every mutation writes the WHOLE array, derived from `items` above, so the
  // index-merged copy in `content.steps.items` can never leak back in.
  const writeItems = (next: HajjStep[]) => setField((d) => { d.steps.items = next; });

  const setStep = (i: number, patch: (step: HajjStep) => HajjStep) =>
    writeItems(items.map((s, idx) => (idx === i ? patch(s) : s)));

  const addStep = () =>
    writeItems([
      ...items,
      // Icons stay on the admin screen (there is a fixed set and a picker for
      // it); a step added here starts on the neutral default.
      { id: `s${Date.now()}`, icon: 'CircleDot', title: tri(''), description: tri('') },
    ]);

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

  if (!items.length && !editing) return null;

  return (
    <section id="hajj-steps" className="relative scroll-mt-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 sm:px-8 lg:px-12">
        <div className="mb-10 max-w-2xl">
          {editing ? (
            <InlineText as="p" lang={locale} dir={dir} value={pick(heading.eyebrow, locale)}
              onCommit={(v) => setField((d) => { d.steps.eyebrow[lang] = v; })}
              className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
              placeholder="Eyebrow" />
          ) : (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
              {pick(heading.eyebrow, locale)}
            </p>
          )}

          {editing ? (
            <InlineText as="h2" lang={locale} dir={dir} value={pick(heading.title, locale)}
              onCommit={(v) => setField((d) => { d.steps.title[lang] = v; })}
              className="text-2xl font-bold text-rmc-green-deep md:text-3xl"
              placeholder="Section title" />
          ) : (
            <h2 className="text-2xl font-bold text-rmc-green-deep md:text-3xl">
              {pick(heading.title, locale)}
            </h2>
          )}

          {editing ? (
            <InlineText as="p" lang={locale} dir={dir} value={pick(heading.subtitle, locale)}
              onCommit={(v) => setField((d) => { d.steps.subtitle[lang] = v; })}
              className="mt-2 text-sm text-gray-500"
              placeholder="Section subtitle" />
          ) : (
            <p className="mt-2 text-sm text-gray-500">{pick(heading.subtitle, locale)}</p>
          )}
        </div>

        <ol className="relative">
          {items.map((step, i) => {
            const Icon = requirementIcon(step.icon);
            const last = i === items.length - 1;
            return (
              <li key={step.id} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Node + the connector running down to the next step. */}
                <div className="relative flex flex-col items-center">
                  <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green-light text-rmc-green shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rmc-green text-[10px] font-bold text-white ring-2 ring-white">
                      {i + 1}
                    </span>
                  </span>
                  {!last && (
                    <span
                      className="absolute top-11 h-full w-px bg-gradient-to-b from-rmc-green/25 to-rmc-green/5"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className={`min-w-0 flex-1 pt-1.5 ${rtl ? 'font-arabic' : ''}`}>
                  {editing ? (
                    <>
                      <CardEditToolbar
                        canMoveUp={i > 0}
                        canMoveDown={i < items.length - 1}
                        onMoveUp={() => moveStep(i, -1)}
                        onMoveDown={() => moveStep(i, 1)}
                        onDelete={() => removeStep(i)}
                      />
                      <InlineText as="h3" lang={locale} dir={dir} value={pick(step.title, locale)}
                        onCommit={(v) => setStep(i, (s) => ({ ...s, title: { ...s.title, [lang]: v } }))}
                        className="text-base font-bold text-rmc-green-deep md:text-lg"
                        placeholder="Step title" />
                      <InlineText as="p" lang={locale} dir={dir} value={pick(step.description, locale)}
                        onCommit={(v) => setStep(i, (s) => ({ ...s, description: { ...s.description, [lang]: v } }))}
                        className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600"
                        placeholder="Step description" />
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-bold text-rmc-green-deep md:text-lg">
                        {pick(step.title, locale)}
                      </h3>
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600">
                        {pick(step.description, locale)}
                      </p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {editing && (
          <button
            type="button"
            onClick={addStep}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-rmc-green/30 px-4 py-2.5 text-sm font-semibold text-rmc-green/70 transition hover:border-rmc-green/60 hover:text-rmc-green"
          >
            <Plus className="h-4 w-4" /> Add step
          </button>
        )}
      </div>
    </section>
  );
}

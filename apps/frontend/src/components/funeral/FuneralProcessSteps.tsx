'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Loader2, CircleDot } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import type { FuneralStepConfig } from '@/components/funeral/types';
import { stepIcon } from '@/components/funeral/stepIcons';
import {
  ContentKeys, pick, raw, isRtl,
  FUNERAL_DEFAULT, type FuneralContent, type Locale,
} from '@/lib/content-api';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';

/**
 * Section: "what happens next" — the funeral process, start to finish.
 *
 * The steps are the SAME records that drive a request's status timeline
 * (`GET /funeral/steps`, managed in Content → Funeral Request Steps), so what a
 * family reads here is exactly what they will be tracking later. Only the
 * heading comes from the Funeral Service content block.
 *
 * A client component (unlike the description above it): the steps API is called
 * through the browser api client. Hides itself when no steps are active.
 */
export function FuneralProcessSteps() {
  const locale = useLocale();
  const rtl = isRtl(locale);

  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Section heading — read on the server by the page, so it is in the first paint.
  // The step list itself still comes from its own API below.
  const { content, setField } = useEditableContent<FuneralContent>(
    ContentKeys.funeral,
    FUNERAL_DEFAULT,
  );
  const heading = content.steps;
  const lang = locale as Locale;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);

  useEffect(() => {
    let active = true;

    funeralApi.listSteps()
      .then((res) => { if (active) setSteps(res); })
      .catch(() => { if (active) setSteps([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  if (!loading && steps.length === 0) return null;

  return (
    <section id="funeral-process" className="relative scroll-mt-24 bg-gray-50/70">
      <div className="pointer-events-none absolute inset-0 pattern-light opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 md:py-20 lg:px-12">
        <div className="mb-6 max-w-2xl">
          <InlineText
            as="p"
            lang={locale}
            value={pick(heading.eyebrow, locale)}
            editValue={raw(heading.eyebrow, locale)}
            onCommit={(v) => setField((d) => { d.steps.eyebrow[lang] = v; })}
            className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
            dir={dir}
            placeholder="Eyebrow"
          />
          <InlineText
            as="h2"
            lang={locale}
            value={pick(heading.title, locale)}
            editValue={raw(heading.title, locale)}
            onCommit={(v) => setField((d) => { d.steps.title[lang] = v; })}
            className="text-2xl font-bold text-gray-900"
            dir={dir}
            placeholder="Heading"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(heading.subtitle, locale)}
            editValue={raw(heading.subtitle, locale)}
            onCommit={(v) => setField((d) => { d.steps.subtitle[lang] = v; })}
            className="mt-2 text-sm leading-relaxed text-gray-500"
            dir={dir}
            placeholder="Subheading"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <ol className="relative">
            {steps.map((step, i) => {
              const Icon = stepIcon(step.icon) ?? CircleDot;
              const last = i === steps.length - 1;
              // Admins can give a step an accent colour; fall back to the brand green.
              const accent = step.color || '#1F7A54';
              return (
                <li key={step.id} className="relative flex gap-5 pb-8 last:pb-0">
                  <div className="relative flex flex-col items-center">
                    <span
                      className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1"
                      style={{ color: accent, boxShadow: `0 0 0 1px ${accent}33` }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-gray-50"
                        style={{ backgroundColor: accent }}
                      >
                        {i + 1}
                      </span>
                    </span>
                    {!last && <span className="absolute top-11 h-full w-px bg-gray-200" aria-hidden="true" />}
                  </div>

                  <div className={`min-w-0 pt-1.5 ${rtl ? 'font-arabic' : ''}`}>
                    <h3 className="text-base font-bold text-gray-900 md:text-lg">
                      {pick(step.title, locale)}
                    </h3>
                    {pick(step.description, locale) && (
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600">
                        {pick(step.description, locale)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

'use client';

/**
 * Section: "Find a mosque or school near you" — the heading plus the shared
 * interactive map from the home page.
 *
 * The map's four button/badge labels are CMS copy too, but they live inside
 * Leaflet markup where a `contentEditable` node cannot sensibly go. So in Edit
 * Mode they are exposed as a small labelled panel under the map instead; the
 * public site never renders it.
 */

import dynamic from 'next/dynamic';
import { pick, type Tri } from '@/lib/content-api';
import { InlineText } from '@/components/edit-mode/InlineText';
import { SectionHeading, useNewMuslimCopy } from './shared';

// Leaflet touches `window`, so the map only loads on the client.
const NearestSchoolMap = dynamic(() => import('@/components/home/NearestSchoolMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-gray-100 sm:h-80" />,
});

export function FindNearby() {
  const { locale, lang, dir, arabicFont, content, editing, setField } = useNewMuslimCopy();
  const c = content.nearby;

  const label = (key: 'locateLabel' | 'locatingLabel' | 'nearestLabel' | 'directionsLabel') =>
    pick(c[key] as Tri, locale);

  return (
    <section id="find-nearby" className="scroll-mt-24 bg-gray-50/60 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading
          heading={c}
          locale={locale}
          dir={dir}
          arabicFont={arabicFont}
          onEyebrow={(v) => setField((d) => { d.nearby.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.nearby.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.nearby.subtitle[lang] = v; })}
        />

        <div className="mt-12 overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-sm">
          <NearestSchoolMap
            locateLabel={label('locateLabel')}
            locatingLabel={label('locatingLabel')}
            nearestLabel={label('nearestLabel')}
            directionsLabel={label('directionsLabel')}
          />
        </div>

        {editing && (
          <div className="mx-auto mt-4 max-w-3xl rounded-lg border-2 border-dashed border-rmc-green/25 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-green/70">
              Map labels
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['locateLabel', 'Locate button'],
                ['locatingLabel', 'While locating'],
                ['nearestLabel', 'Nearest badge'],
                ['directionsLabel', 'Directions link'],
              ] as const).map(([key, caption]) => (
                <label key={key} className="block">
                  <span className="text-[11px] font-medium text-gray-400">{caption}</span>
                  <InlineText
                    as="p"
                    lang={locale}
                    dir={dir}
                    value={label(key)}
                    onCommit={(v) => setField((d) => { d.nearby[key][lang] = v; })}
                    className="mt-0.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800"
                    placeholder={caption}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

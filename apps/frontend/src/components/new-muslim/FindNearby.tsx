'use client';

/**
 * Section: "Find a mosque near you" — the heading plus the SHARED mosque finder,
 * the same one the contact page uses.
 *
 * It used to render `NearestSchoolMap`, which drew a dashed straight line from the
 * visitor to the nearest pin. That line was easy to read as a route and was not one: it
 * ignored roads entirely, and actually going anywhere meant following a link out to
 * Google Maps. The shared finder draws a real road route with distance and travel time,
 * and brings the province overlay and the "Find near me" button with it.
 *
 * The four map labels this section used to own as CMS copy are gone with it — the shared
 * finder carries its own, so keeping editable fields here would have meant editing text
 * that renders nowhere.
 */

import dynamic from 'next/dynamic';
import { SectionHeading, useNewMuslimCopy } from './shared';

// Leaflet touches `window`, so the map only loads on the client.
const MosqueFinder = dynamic(
  () => import('@/components/contact/MosqueFinder').then((m) => m.MosqueFinder),
  {
    ssr: false,
    loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100 sm:h-[34rem]" />,
  },
);

export function FindNearby() {
  const { locale, lang, dir, arabicFont, content, setField } = useNewMuslimCopy();
  const c = content.nearby;

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

        {/* No wrapper border: MosqueFinder brings its own rounded card, and nesting one
            inside another drew a double edge. */}
        <div className="mt-12">
          <MosqueFinder />
        </div>
      </div>
    </section>
  );
}

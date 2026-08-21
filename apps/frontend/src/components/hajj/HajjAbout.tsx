'use client';

import { useLocale } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys, pick, isRtl, hajjPhotoSrc,
  HAJJ_DEFAULT, type HajjContent, type Locale,
} from '@/lib/content-api';

/** The Talbiyah overlaid on the photo — scripture, not admin-editable copy. */
const TALBIYAH = 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ';

/**
 * Descriptive intro: a pilgrim photo alongside a description and an incentive
 * paragraph that nudges the visitor to begin registration.
 *
 * Copy and the photo are admin-managed (Content → Hajj Service), and editable in
 * place here for a super-admin in Edit Mode.
 */
export function HajjAbout() {
  const locale = useLocale();
  const lang = locale as Locale;
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  const { content, editing, setField } = useEditableContent<HajjContent>(
    ContentKeys.hajj,
    HAJJ_DEFAULT,
  );

  const about = content.about;

  return (
    <section className="relative bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Photo */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-md ring-1 ring-black/5">
              {/*
                A plain <img>, not next/image: the photo is admin-supplied, and
                next/image rejects any host not listed in remotePatterns — so an
                admin pasting a URL from a new host would crash the page. Same
                choice the Areas section makes for its CMS images.
              */}
              {editing ? (
                // Sits in the same absolute frame as the <img> it replaces, so
                // the wash, pattern and Talbiyah below still layer on top of it.
                <InlineImage
                  value={about.photoUrl}
                  onChange={(key) => setField((d) => { d.about.photoUrl = key; })}
                  folder="hajj"
                  alt={pick(about.photoAlt, locale)}
                  className="absolute inset-0 h-full w-full"
                  imgClassName="object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={hajjPhotoSrc(about.photoUrl)}
                  alt={pick(about.photoAlt, locale)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/70 via-transparent to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" aria-hidden="true" />
              <p className="absolute bottom-5 left-5 right-5 font-arabic text-xl text-rmc-gold-light drop-shadow" dir="rtl" lang="ar">
                {TALBIYAH}
              </p>
            </div>
            {/* Soft gold accent behind the frame. */}
            <div className="pointer-events-none absolute -bottom-4 -right-4 -z-10 h-32 w-32 rounded-lg bg-rmc-gold/20 blur-2xl" aria-hidden="true" />
          </div>

          {/* Text */}
          <div>
            {editing ? (
              <InlineText as="p" lang={locale} dir={dir} value={pick(about.eyebrow, locale)}
                onCommit={(v) => setField((d) => { d.about.eyebrow[lang] = v; })}
                className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
                placeholder="Eyebrow" />
            ) : (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">{pick(about.eyebrow, locale)}</p>
            )}

            {editing ? (
              <InlineText as="h2" lang={locale} dir={dir} value={pick(about.title, locale)}
                onCommit={(v) => setField((d) => { d.about.title[lang] = v; })}
                className="text-2xl font-bold leading-snug text-rmc-green-deep md:text-3xl"
                placeholder="Section title" />
            ) : (
              <h2 className="text-2xl font-bold leading-snug text-rmc-green-deep md:text-3xl">{pick(about.title, locale)}</h2>
            )}

            {editing ? (
              <InlineText as="p" lang={locale} dir={dir} value={pick(about.description, locale)}
                onCommit={(v) => setField((d) => { d.about.description[lang] = v; })}
                className="mt-4 text-sm leading-relaxed text-gray-600 md:text-[15px]"
                placeholder="Description" />
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-[15px]">{pick(about.description, locale)}</p>
            )}

            {/* Incentive callout */}
            <div className="mt-5 flex gap-3 rounded-lg border border-rmc-gold/30 bg-rmc-gold/[0.07] p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-rmc-gold" aria-hidden="true" />
              {editing ? (
                <InlineText as="p" lang={locale} dir={dir} value={pick(about.incentive, locale)}
                  onCommit={(v) => setField((d) => { d.about.incentive[lang] = v; })}
                  className="flex-1 text-[13.5px] leading-relaxed text-gray-700"
                  placeholder="Incentive" />
              ) : (
                <p className="text-[13.5px] leading-relaxed text-gray-700">{pick(about.incentive, locale)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

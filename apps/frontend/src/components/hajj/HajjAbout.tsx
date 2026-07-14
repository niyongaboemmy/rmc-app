'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  ContentKeys, getSiteContent, mergeContent, pick, hajjPhotoSrc,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';

/** The Talbiyah overlaid on the photo — scripture, not admin-editable copy. */
const TALBIYAH = 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ';

/**
 * Descriptive intro: a pilgrim photo alongside a description and an incentive
 * paragraph that nudges the visitor to begin registration.
 *
 * Copy and the photo are admin-managed (Content → Hajj Service).
 */
export function HajjAbout() {
  const locale = useLocale();
  const [content, setContent] = useState<HajjContent>(HAJJ_DEFAULT);

  useEffect(() => {
    let active = true;
    getSiteContent<HajjContent>(ContentKeys.hajj)
      .then((data) => {
        if (active && data) setContent(mergeContent(HAJJ_DEFAULT, data));
      })
      .catch(() => { /* keep the defaults — a CMS outage must not blank the page */ });
    return () => { active = false; };
  }, []);

  const about = content.about;

  return (
    <section className="relative bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Photo */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md ring-1 ring-black/5">
              {/*
                A plain <img>, not next/image: the photo is admin-supplied, and
                next/image rejects any host not listed in remotePatterns — so an
                admin pasting a URL from a new host would crash the page. Same
                choice the Areas section makes for its CMS images.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hajjPhotoSrc(about.photoUrl)}
                alt={pick(about.photoAlt, locale)}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/70 via-transparent to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-10" aria-hidden="true" />
              <p className="absolute bottom-5 left-5 right-5 font-arabic text-xl text-rmc-gold-light drop-shadow" dir="rtl" lang="ar">
                {TALBIYAH}
              </p>
            </div>
            {/* Soft gold accent behind the frame. */}
            <div className="pointer-events-none absolute -bottom-4 -right-4 -z-10 h-32 w-32 rounded-3xl bg-rmc-gold/20 blur-2xl" aria-hidden="true" />
          </div>

          {/* Text */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">{pick(about.eyebrow, locale)}</p>
            <h2 className="text-2xl font-bold leading-snug text-rmc-green-deep md:text-3xl">{pick(about.title, locale)}</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-[15px]">{pick(about.description, locale)}</p>

            {/* Incentive callout */}
            <div className="mt-5 flex gap-3 rounded-2xl border border-rmc-gold/30 bg-rmc-gold/[0.07] p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-rmc-gold" aria-hidden="true" />
              <p className="text-[13.5px] leading-relaxed text-gray-700">{pick(about.incentive, locale)}</p>
            </div>

            <Link
              href={`/${locale}/services/hajj/register`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              {pick(about.cta, locale)} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

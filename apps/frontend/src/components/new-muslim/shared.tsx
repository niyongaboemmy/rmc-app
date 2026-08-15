'use client';

/**
 * Shared plumbing for the "Welcome to Islam" page sections.
 *
 * Every section is its own client island bound to the single `new-muslim` CMS
 * section, so a super-admin edits the whole page in place in Edit Mode while the
 * public site renders identical plain text.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen, GraduationCap, HandHeart, Heart, MapPin, Moon, Sparkles,
  Users, CircleDot,
} from 'lucide-react';
import {
  ContentKeys, NEW_MUSLIM_DEFAULT, getSiteContent, isRtl, pick,
  type Locale, type NewMuslimContent, type Tri,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineSelect, type InlineSelectOption } from '@/components/edit-mode/InlineSelect';

/** Read/write access to the `new-muslim` section, plus the locale bits. */
export function useNewMuslimCopy() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<NewMuslimContent>(
    ContentKeys.newMuslim,
    NEW_MUSLIM_DEFAULT,
  );
  const rtl = isRtl(locale);
  return {
    locale,
    lang: locale as Locale,
    rtl,
    dir: (rtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    /** Arabic needs its own face; the other two locales use the body font. */
    arabicFont: rtl ? 'font-arabic' : '',
    content,
    editing,
    setField,
  };
}

/**
 * The RAW saved blob for this section — never merged over the defaults.
 *
 * `mergeContent` walks arrays by index, which is right for headings and wrong
 * for collections: a deleted card would inherit the seeded card that used to sit
 * at its index and reappear on the page. Sections that render a collection read
 * it from here (through `newMuslimSteps` / `newMuslimDuas`) instead, preferring
 * the live edit draft when one exists. Same idiom as the Hajj page.
 */
export function useSavedNewMuslim(): NewMuslimContent | null {
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();
  // Seeded from the server read the page performs, so the first paint carries the
  // saved copy. Deliberately still the RAW blob rather than `usePreviewableContent`,
  // for the index-merge reason in this file's header.
  const server = useServerSiteContent<NewMuslimContent>(ContentKeys.newMuslim);
  const [saved, setSaved] = useState<NewMuslimContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);

  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<NewMuslimContent>(ContentKeys.newMuslim)
      .then((data) => { if (active && data) setSaved(data); })
      .catch(() => { /* nothing saved yet — the seeded collection stands */ });
    return () => { active = false; };
  }, [refreshKey]);

  return (store?.getOverride(ContentKeys.newMuslim) as NewMuslimContent | undefined) ?? saved;
}

/* ── Icons an admin can pick for a "first step" card ──────────────────────── */
const STEP_ICONS: Record<string, LucideIcon> = {
  GraduationCap, BookOpen, MapPin, HandHeart, Heart, Moon, Sparkles, Users,
};

export const STEP_ICON_OPTIONS: InlineSelectOption[] = [
  { value: 'GraduationCap', label: 'Learning', icon: GraduationCap },
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'MapPin', label: 'Place', icon: MapPin },
  { value: 'HandHeart', label: 'Care', icon: HandHeart },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Moon', label: 'Crescent', icon: Moon },
  { value: 'Sparkles', label: 'Sparkle', icon: Sparkles },
  { value: 'Users', label: 'Community', icon: Users },
];

/** Resolve a stored icon name; unknown/unset falls back to a neutral dot. */
export function stepIcon(name?: string): LucideIcon {
  return (name && STEP_ICONS[name]) || CircleDot;
}

export { InlineSelect };

/* ── Centered section heading ─────────────────────────────────────────────── */

/**
 * Eyebrow → title → gold ornament divider → subtitle, the heading treatment the
 * rest of the site uses. `tone="dark"` lightens the type for the deep-green band.
 */
export function SectionHeading({
  heading,
  locale,
  dir,
  arabicFont,
  tone = 'light',
  onEyebrow,
  onTitle,
  onSubtitle,
}: {
  heading: { eyebrow: Tri; title: Tri; subtitle: Tri };
  locale: string;
  dir: 'ltr' | 'rtl';
  arabicFont: string;
  tone?: 'light' | 'dark';
  onEyebrow: (v: string) => void;
  onTitle: (v: string) => void;
  onSubtitle: (v: string) => void;
}) {
  const titleColor = tone === 'dark' ? 'text-white' : 'text-rmc-green-deep';
  const subtitleColor = tone === 'dark' ? 'text-white/70' : 'text-gray-500';

  return (
    <div className="mx-auto max-w-2xl text-center" dir={dir}>
      <InlineText
        as="p"
        lang={locale}
        dir={dir}
        value={pick(heading.eyebrow, locale)}
        onCommit={onEyebrow}
        className={`text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold ${arabicFont}`}
        placeholder="Eyebrow"
      />
      <InlineText
        as="h2"
        lang={locale}
        dir={dir}
        value={pick(heading.title, locale)}
        onCommit={onTitle}
        className={`mt-2 text-2xl font-bold md:text-3xl ${titleColor} ${arabicFont}`}
        placeholder="Section title"
      />
      <div className="ornament-divider mx-auto my-4 max-w-xs" aria-hidden>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
      </div>
      <InlineText
        as="p"
        lang={locale}
        dir={dir}
        value={pick(heading.subtitle, locale)}
        onCommit={onSubtitle}
        className={`text-sm leading-relaxed md:text-base ${subtitleColor} ${arabicFont}`}
        placeholder="Subtitle"
      />
    </div>
  );
}

/** Gradient icon chip — the same one the Dawah cards use. */
export function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
      <Icon className="h-6 w-6" aria-hidden />
    </span>
  );
}

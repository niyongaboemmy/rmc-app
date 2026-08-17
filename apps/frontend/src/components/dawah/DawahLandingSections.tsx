'use client';

/**
 * Client islands for the Dawah landing page's CMS copy.
 *
 * The page itself stays a server component (it does the async content + course
 * + discussion fetches and server-only rich-text sanitising). These islands
 * render the editable prose so a super-admin can edit it inline in Edit Mode —
 * every field is one `InlineText` bound to the shared `dawah` content section,
 * so edits accumulate on one draft and publish together. Public visitors see
 * the exact same markup and text as before.
 *
 * The rich-text description BODY is NOT inline-editable (it needs the admin
 * rich-text editor); it is sanitised on the server and passed in as a string.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpen, Library, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';
import {
  ContentKeys,
  DAWAH_DEFAULT,
  pick,
  raw,
  isRtl,
  type DawahContent,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/**
 * Loaded on demand. TipTap is a large dependency and only a super-admin in Edit Mode
 * ever renders it; a static import would put the whole editor in the bundle every
 * visitor of /dawah downloads. `ssr: false` because it is browser-only.
 */
const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false },
);

/** True when the HTML carries no actual words — an empty editor saves "<p></p>". */
function isBlank(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

/** Shared hook: the live dawah copy + a `set(path)` helper for one Tri field. */
function useDawahCopy() {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const { content, editing, setField } = useEditableContent<DawahContent>(
    ContentKeys.dawah,
    DAWAH_DEFAULT,
  );
  return { locale, lang, content, editing, setField };
}

// ── Hero ────────────────────────────────────────────────────────────────────
export function DawahHero() {
  const { locale, lang, content, setField } = useDawahCopy();
  return (
    <PageHero
      paddingClassName="pt-28 pb-10"
      minHeightClassName="min-h-[40vh]"
      title={
        <InlineText
          as="span"
          lang={locale}
          value={pick(content.hero.title, locale)}
          editValue={raw(content.hero.title, locale)}
          onCommit={(v) => setField((d) => { d.hero.title[lang] = v; })}
          placeholder="Hero title"
        />
      }
      subtitle={
        <InlineText
          as="span"
          lang={locale}
          value={pick(content.hero.subtitle, locale)}
          editValue={raw(content.hero.subtitle, locale)}
          onCommit={(v) => setField((d) => { d.hero.subtitle[lang] = v; })}
          placeholder="Hero subtitle"
        />
      }
    />
  );
}

// ── Description / intro section (body arrives pre-sanitised from the server) ──
export function DawahIntro({ bodyHtml }: { bodyHtml: string }) {
  const { locale, lang, content, editing, setField } = useDawahCopy();
  const rtl = isRtl(locale);

  // The page used to gate this section on the body having text, which meant an admin
  // who cleared it lost the section and the only way back into it. The gate lives
  // here now so it can spare Edit Mode.
  if (isBlank(bodyHtml) && !editing) return null;

  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50/70 p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.04]" aria-hidden />
          <div className="pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full bg-rmc-gold/10 blur-2xl" aria-hidden />

          <div className="relative grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
            {/* Label column */}
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rmc-green-light text-rmc-green ring-1 ring-inset ring-rmc-green/10">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.description.eyebrow, locale)}
                editValue={raw(content.description.eyebrow, locale)}
                onCommit={(v) => setField((d) => { d.description.eyebrow[lang] = v; })}
                className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold"
                placeholder="Eyebrow"
              />
              <InlineText
                as="h2"
                lang={locale}
                value={pick(content.description.title, locale)}
                editValue={raw(content.description.title, locale)}
                onCommit={(v) => setField((d) => { d.description.title[lang] = v; })}
                className="mt-1.5 text-xl font-bold leading-snug text-rmc-green-deep md:text-2xl"
                placeholder="Title"
              />
            </div>

            {/* Body column — admin rich text, sanitised on the server. In Edit Mode
                the prose is replaced in place by the editor that authored it: it is
                HTML, so an InlineText here would flatten every paragraph and link. */}
            {editing ? (
              /* Keyed by language: the editor seeds its content once, so switching
                 locale without a remount would leave the previous language in the box. */
              <RichTextEditor
                key={lang}
                value={raw(content.description.body, locale)}
                onChange={(next) => setField((d) => { d.description.body[lang] = next; })}
                dir={rtl ? 'rtl' : 'ltr'}
                fontClassName={rtl ? 'font-arabic' : ''}
              />
            ) : (
              <div
                dir={rtl ? 'rtl' : 'ltr'}
                className="prose prose-sm md:prose-base max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold md:border-s md:border-gray-200/70 md:ps-10"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Courses-outline heading ───────────────────────────────────────────────────
export function DawahCoursesHeading() {
  const { locale, lang, content, setField } = useDawahCopy();
  return (
    <div className="mx-auto max-w-2xl text-center">
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.courses.eyebrow, locale)}
        editValue={raw(content.courses.eyebrow, locale)}
        onCommit={(v) => setField((d) => { d.courses.eyebrow[lang] = v; })}
        className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold"
        placeholder="Eyebrow"
      />
      <InlineText
        as="h2"
        lang={locale}
        value={pick(content.courses.title, locale)}
        editValue={raw(content.courses.title, locale)}
        onCommit={(v) => setField((d) => { d.courses.title[lang] = v; })}
        className="mt-2 text-2xl font-bold text-rmc-green-deep md:text-3xl"
        placeholder="Title"
      />
      <div className="ornament-divider mx-auto my-4 max-w-xs">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
      </div>
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.courses.subtitle, locale)}
        editValue={raw(content.courses.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.courses.subtitle[lang] = v; })}
        className="text-sm leading-relaxed text-gray-500"
        placeholder="Subtitle"
      />
    </div>
  );
}

// ── "Browse all courses" button (editable label) ─────────────────────────────
export function DawahBrowseCoursesButton() {
  const { locale, lang, content, setField } = useDawahCopy();
  return (
    <div className="mt-10 text-center">
      <Link
        href={`/${locale}/dawah/courses`}
        className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-green-dark"
      >
        <InlineText
          as="span"
          lang={locale}
          value={pick(content.courses.cta, locale)}
          editValue={raw(content.courses.cta, locale)}
          onCommit={(v) => setField((d) => { d.courses.cta[lang] = v; })}
          placeholder="Button label"
        />
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}

// ── Recent-discussions heading (editable title + subtitle) ───────────────────
export function DawahDiscussionsHeading() {
  const { locale, lang, content, setField } = useDawahCopy();
  return (
    <div className="mx-auto max-w-2xl text-center">
      <InlineText
        as="h2"
        lang={locale}
        value={pick(content.discussions.title, locale)}
        editValue={raw(content.discussions.title, locale)}
        onCommit={(v) => setField((d) => { d.discussions.title[lang] = v; })}
        className="text-2xl font-bold text-rmc-green-deep md:text-3xl"
        placeholder="Title"
      />
      <div className="ornament-divider mx-auto my-4 max-w-xs">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
      </div>
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.discussions.subtitle, locale)}
        editValue={raw(content.discussions.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.discussions.subtitle[lang] = v; })}
        className="text-sm leading-relaxed text-gray-500"
        placeholder="Subtitle"
      />
    </div>
  );
}

// ── Recent-discussions buttons (editable labels) ─────────────────────────────
export function DawahDiscussionsCtas() {
  const { locale, lang, content, setField } = useDawahCopy();
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <Link
        href={`/${locale}/dawah/discussions`}
        className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rmc-green/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-green-dark"
      >
        <InlineText
          as="span"
          lang={locale}
          value={pick(content.discussions.viewAll, locale)}
          editValue={raw(content.discussions.viewAll, locale)}
          onCommit={(v) => setField((d) => { d.discussions.viewAll[lang] = v; })}
          placeholder="Link label"
        />
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
      <Link
        href={`/${locale}/dawah/discussions/ask`}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-rmc-green transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/40"
      >
        <InlineText
          as="span"
          lang={locale}
          value={pick(content.discussions.askCta, locale)}
          editValue={raw(content.discussions.askCta, locale)}
          onCommit={(v) => setField((d) => { d.discussions.askCta[lang] = v; })}
          placeholder="Link label"
        />
      </Link>
    </div>
  );
}

// ── The two CTA cards → Courses and Library ──────────────────────────────────
export function DawahCtaCards() {
  const { locale, lang, content, setField } = useDawahCopy();
  const cards = [
    { key: 'courses' as const, href: `/${locale}/dawah/courses`, icon: BookOpen },
    { key: 'library' as const, href: `/${locale}/dawah/library`, icon: Library },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {cards.map(({ key, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-[0_12px_28px_-16px_rgba(26,122,74,0.2)]"
        >
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.03]" aria-hidden />

          <span className="relative grid h-14 w-14 place-items-center rounded-lg bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
            <Icon className="h-7 w-7" aria-hidden />
          </span>

          <InlineText
            as="p"
            lang={locale}
            value={pick(content.cta[key].eyebrow, locale)}
            editValue={raw(content.cta[key].eyebrow, locale)}
            onCommit={(v) => setField((d) => { d.cta[key].eyebrow[lang] = v; })}
            className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold"
            placeholder="Eyebrow"
          />
          <InlineText
            as="h3"
            lang={locale}
            value={pick(content.cta[key].title, locale)}
            editValue={raw(content.cta[key].title, locale)}
            onCommit={(v) => setField((d) => { d.cta[key].title[lang] = v; })}
            className="relative mt-1.5 text-xl font-bold text-gray-900"
            placeholder="Title"
          />
          <span
            aria-hidden
            className="relative mt-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(content.cta[key].subtitle, locale)}
            editValue={raw(content.cta[key].subtitle, locale)}
            onCommit={(v) => setField((d) => { d.cta[key].subtitle[lang] = v; })}
            className="relative mt-4 text-sm leading-relaxed text-gray-500"
            placeholder="Body"
          />

          <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green">
            <InlineText
              as="span"
              lang={locale}
              value={pick(content.cta[key].action, locale)}
              editValue={raw(content.cta[key].action, locale)}
              onCommit={(v) => setField((d) => { d.cta[key].action[lang] = v; })}
              placeholder="Link label"
            />
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}

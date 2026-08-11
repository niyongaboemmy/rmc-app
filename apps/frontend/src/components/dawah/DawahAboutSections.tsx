'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  HandHelping,
  Heart,
  HeartHandshake,
  MessageCircle,
  Quote,
  Sparkles,
  Sprout,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  ContentKeys,
  DAWAH_DEFAULT,
  pick,
  type DawahContent,
  type Locale,
  type Tri,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/**
 * Informational "what / why / how" sections for the Dawah landing page.
 *
 * These explain the concept of Dawah to a first-time visitor. Every field is an
 * `InlineText` bound to the shared `dawah` content section, so a super-admin can
 * edit the whole page in-context in Edit Mode — exactly like the hero, the
 * description and the catalogue cards. On the public site the same components
 * render plain text with zero behavioural change.
 *
 * Copy and its three languages live in DAWAH_DEFAULT.about; nothing here is
 * hard-coded prose.
 */

/** Shared read/write access to the dawah content section for one island. */
function useAboutCopy() {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const { content, setField } = useEditableContent<DawahContent>(
    ContentKeys.dawah,
    DAWAH_DEFAULT,
  );
  return { locale, lang, about: content.about, setField };
}

/* ── Shared centered, editable heading block ─────────────────────────────── */
function EditableHeading({
  locale,
  eyebrow,
  title,
  subtitle,
  onEyebrow,
  onTitle,
  onSubtitle,
}: {
  locale: string;
  eyebrow: Tri;
  title: Tri;
  subtitle?: Tri;
  onEyebrow: (v: string) => void;
  onTitle: (v: string) => void;
  onSubtitle?: (v: string) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <InlineText
        as="p"
        lang={locale}
        value={pick(eyebrow, locale)}
        onCommit={onEyebrow}
        className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold"
        placeholder="Eyebrow"
      />
      <InlineText
        as="h2"
        lang={locale}
        value={pick(title, locale)}
        onCommit={onTitle}
        className="mt-2 text-2xl font-bold text-rmc-green-deep md:text-3xl"
        placeholder="Section title"
      />
      <div className="ornament-divider mx-auto my-4 max-w-xs">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
      </div>
      {subtitle !== undefined && onSubtitle && (
        <InlineText
          as="p"
          lang={locale}
          value={pick(subtitle, locale)}
          onCommit={onSubtitle}
          className="text-sm leading-relaxed text-gray-500 md:text-base"
          placeholder="Subtitle"
        />
      )}
    </div>
  );
}

/* Gradient icon chip — reused from the CTA cards for a consistent look. */
function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
      <Icon className="h-6 w-6" aria-hidden />
    </span>
  );
}

/* ── 1. What is Dawah? ───────────────────────────────────────────────────── */
export function WhatIsDawah() {
  const { locale, lang, about, setField } = useAboutCopy();
  const w = about.what;
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <EditableHeading
          locale={locale}
          eyebrow={w.eyebrow}
          title={w.title}
          onEyebrow={(v) => setField((d) => { d.about.what.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.about.what.title[lang] = v; })}
        />

        <InlineText
          as="p"
          lang={locale}
          value={pick(w.lead, locale)}
          onCommit={(v) => setField((d) => { d.about.what.lead[lang] = v; })}
          className="mx-auto mt-2 max-w-3xl text-center text-base leading-relaxed text-gray-600 md:text-lg"
          placeholder="Lead paragraph"
        />

        {/* Qur'anic invitation — the verse dawah is grounded in. */}
        <figure className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-lg border border-rmc-gold/25 bg-rmc-green-light/40 p-6 text-center shadow-sm sm:p-8">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.05]" aria-hidden />
          <Quote className="relative mx-auto h-7 w-7 text-rmc-gold" aria-hidden />
          <blockquote className="relative mt-4 text-lg font-medium leading-relaxed text-rmc-green-deep md:text-xl">
            <InlineText
              as="span"
              lang={locale}
              value={pick(w.verse, locale)}
              onCommit={(v) => setField((d) => { d.about.what.verse[lang] = v; })}
              placeholder="Verse"
            />
          </blockquote>
          <figcaption className="relative mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-rmc-gold">
            <InlineText
              as="span"
              lang={locale}
              value={pick(w.verseRef, locale)}
              onCommit={(v) => setField((d) => { d.about.what.verseRef[lang] = v; })}
              placeholder="Reference"
            />
          </figcaption>
        </figure>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <InlineText
            as="p"
            lang={locale}
            value={pick(w.p1, locale)}
            onCommit={(v) => setField((d) => { d.about.what.p1[lang] = v; })}
            className="text-sm leading-relaxed text-gray-600 md:text-base"
            placeholder="Paragraph one"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(w.p2, locale)}
            onCommit={(v) => setField((d) => { d.about.what.p2[lang] = v; })}
            className="text-sm leading-relaxed text-gray-600 md:text-base"
            placeholder="Paragraph two"
          />
        </div>
      </div>
    </section>
  );
}

/* ── 2. Why Dawah matters ────────────────────────────────────────────────── */
const WHY_CARDS = [
  { key: 'understanding', icon: Users },
  { key: 'character', icon: Sparkles },
  { key: 'community', icon: HeartHandshake },
] as const;

export function WhyDawahMatters() {
  const { locale, lang, about, setField } = useAboutCopy();
  return (
    <section className="bg-gray-50/60 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <EditableHeading
          locale={locale}
          eyebrow={about.why.eyebrow}
          title={about.why.title}
          subtitle={about.why.subtitle}
          onEyebrow={(v) => setField((d) => { d.about.why.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.about.why.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.about.why.subtitle[lang] = v; })}
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {WHY_CARDS.map(({ key, icon }) => (
            <div
              key={key}
              className="relative overflow-hidden rounded-lg border border-gray-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.03]" aria-hidden />
              <div className="relative">
                <IconChip icon={icon} />
                <InlineText
                  as="h3"
                  lang={locale}
                  value={pick(about.why.cards[key].title, locale)}
                  onCommit={(v) => setField((d) => { d.about.why.cards[key].title[lang] = v; })}
                  className="mt-5 text-lg font-bold text-gray-900"
                  placeholder="Card title"
                />
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(about.why.cards[key].body, locale)}
                  onCommit={(v) => setField((d) => { d.about.why.cards[key].body[lang] = v; })}
                  className="mt-2.5 text-sm leading-relaxed text-gray-500"
                  placeholder="Card body"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. Core principles ──────────────────────────────────────────────────── */
const PRINCIPLES = [
  { key: 'wisdom', icon: Compass },
  { key: 'compassion', icon: Heart },
  { key: 'knowledge', icon: GraduationCap },
  { key: 'character', icon: Sparkles },
  { key: 'patience', icon: Sprout },
] as const;

export function CorePrinciples() {
  const { locale, lang, about, setField } = useAboutCopy();
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <EditableHeading
          locale={locale}
          eyebrow={about.principles.eyebrow}
          title={about.principles.title}
          subtitle={about.principles.subtitle}
          onEyebrow={(v) => setField((d) => { d.about.principles.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.about.principles.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.about.principles.subtitle[lang] = v; })}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group flex items-start gap-4 rounded-lg border border-gray-200/70 bg-gray-50/50 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:bg-white hover:shadow-md"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rmc-green-light text-rmc-green ring-1 ring-inset ring-rmc-green/10 transition-colors group-hover:bg-rmc-green group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <InlineText
                  as="h3"
                  lang={locale}
                  value={pick(about.principles.items[key].title, locale)}
                  onCommit={(v) => setField((d) => { d.about.principles.items[key].title[lang] = v; })}
                  className="text-base font-bold text-gray-900"
                  placeholder="Principle"
                />
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(about.principles.items[key].body, locale)}
                  onCommit={(v) => setField((d) => { d.about.principles.items[key].body[lang] = v; })}
                  className="mt-1.5 text-sm leading-relaxed text-gray-500"
                  placeholder="Principle body"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. How Dawah is practiced ───────────────────────────────────────────── */
const PRACTICES = [
  { key: 'example', icon: UserCheck },
  { key: 'learning', icon: BookOpen },
  { key: 'conversation', icon: MessageCircle },
  { key: 'service', icon: HandHelping },
] as const;

export function HowPracticed() {
  const { locale, lang, about, setField } = useAboutCopy();
  return (
    <section className="bg-gray-50/60 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <EditableHeading
          locale={locale}
          eyebrow={about.practices.eyebrow}
          title={about.practices.title}
          subtitle={about.practices.subtitle}
          onEyebrow={(v) => setField((d) => { d.about.practices.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.about.practices.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.about.practices.subtitle[lang] = v; })}
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PRACTICES.map(({ key, icon }, i) => (
            <div
              key={key}
              className="relative flex gap-5 rounded-lg border border-gray-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md"
            >
              <div className="flex flex-col items-center">
                <IconChip icon={icon} />
                <span className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-rmc-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <InlineText
                  as="h3"
                  lang={locale}
                  value={pick(about.practices.items[key].title, locale)}
                  onCommit={(v) => setField((d) => { d.about.practices.items[key].title[lang] = v; })}
                  className="text-lg font-bold text-gray-900"
                  placeholder="Approach"
                />
                <InlineText
                  as="p"
                  lang={locale}
                  value={pick(about.practices.items[key].body, locale)}
                  onCommit={(v) => setField((d) => { d.about.practices.items[key].body[lang] = v; })}
                  className="mt-2 text-sm leading-relaxed text-gray-500"
                  placeholder="Approach body"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. FAQ — native <details> accordion, matching the services pages ────── */
const FAQ_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;

export function DawahFaq() {
  const { locale, lang, about, setField } = useAboutCopy();
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
        <EditableHeading
          locale={locale}
          eyebrow={about.faq.eyebrow}
          title={about.faq.title}
          subtitle={about.faq.subtitle}
          onEyebrow={(v) => setField((d) => { d.about.faq.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.about.faq.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.about.faq.subtitle[lang] = v; })}
        />

        <div className="mt-10 space-y-3">
          {FAQ_KEYS.map((key) => (
            <details
              key={key}
              open
              className="group rounded-lg border border-gray-200/70 bg-gray-50/50 p-5 transition-colors duration-200 hover:border-rmc-green/40 [&_summary]:list-none"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold text-gray-900">
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(about.faq.items[key].q, locale)}
                  onCommit={(v) => setField((d) => { d.about.faq.items[key].q[lang] = v; })}
                  placeholder="Question"
                />
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rmc-green-light text-base leading-none text-rmc-green-dark transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <InlineText
                as="p"
                lang={locale}
                value={pick(about.faq.items[key].a, locale)}
                onCommit={(v) => setField((d) => { d.about.faq.items[key].a[lang] = v; })}
                className="mt-3 text-sm leading-relaxed text-gray-600"
                placeholder="Answer"
              />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. Closing call-to-action ───────────────────────────────────────────── */
export function DawahFinalCta() {
  const { locale, lang, about, setField } = useAboutCopy();
  const c = about.cta;
  return (
    <section className="relative overflow-hidden bg-rmc-green-deep py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.08]" aria-hidden />
      <div
        className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 rounded-full bg-rmc-gold/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-8">
        <InlineText
          as="p"
          lang={locale}
          value={pick(c.eyebrow, locale)}
          onCommit={(v) => setField((d) => { d.about.cta.eyebrow[lang] = v; })}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold"
          placeholder="Eyebrow"
        />
        <InlineText
          as="h2"
          lang={locale}
          value={pick(c.title, locale)}
          onCommit={(v) => setField((d) => { d.about.cta.title[lang] = v; })}
          className="mt-2 text-2xl font-bold text-white md:text-3xl"
          placeholder="CTA title"
        />
        <InlineText
          as="p"
          lang={locale}
          value={pick(c.subtitle, locale)}
          onCommit={(v) => setField((d) => { d.about.cta.subtitle[lang] = v; })}
          className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base"
          placeholder="CTA subtitle"
        />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/dawah/courses`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rmc-green-deep shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-gold hover:text-white"
          >
            <InlineText
              as="span"
              lang={locale}
              value={pick(c.primary, locale)}
              onCommit={(v) => setField((d) => { d.about.cta.primary[lang] = v; })}
              placeholder="Primary action"
            />
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-gold/60 hover:text-white"
          >
            <InlineText
              as="span"
              lang={locale}
              value={pick(c.secondary, locale)}
              onCommit={(v) => setField((d) => { d.about.cta.secondary[lang] = v; })}
              placeholder="Secondary action"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

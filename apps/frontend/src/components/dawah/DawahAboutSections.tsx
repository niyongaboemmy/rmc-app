import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
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

/**
 * Informational "what / why / how" sections for the Dawah landing page.
 *
 * These explain the concept of Dawah to a first-time visitor. They are static,
 * fully-translated copy (dawah.about.* in the message files), rendered as server
 * components so they compose with the server page and add no client JS. Styling
 * mirrors the rest of the page: ornament dividers, the gold eyebrow, the
 * gradient icon chip from DawahCtaCards, and rounded-lg cards.
 */

/* ── Shared centered heading block ───────────────────────────────────────── */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-rmc-green-deep md:text-3xl">{title}</h2>
      <div className="ornament-divider mx-auto my-4 max-w-xs">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
      </div>
      {subtitle && <p className="text-sm leading-relaxed text-gray-500 md:text-base">{subtitle}</p>}
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
export async function WhatIsDawah() {
  const t = await getTranslations('dawah.about.what');
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />

        <p className="mx-auto mt-2 max-w-3xl text-center text-base leading-relaxed text-gray-600 md:text-lg">
          {t('lead')}
        </p>

        {/* Qur'anic invitation — the verse dawah is grounded in. */}
        <figure className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-lg border border-rmc-gold/25 bg-rmc-green-light/40 p-6 text-center shadow-sm sm:p-8">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.05]" aria-hidden />
          <Quote className="relative mx-auto h-7 w-7 text-rmc-gold" aria-hidden />
          <blockquote className="relative mt-4 text-lg font-medium leading-relaxed text-rmc-green-deep md:text-xl">
            {t('verse')}
          </blockquote>
          <figcaption className="relative mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-rmc-gold">
            {t('verseRef')}
          </figcaption>
        </figure>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <p className="text-sm leading-relaxed text-gray-600 md:text-base">{t('p1')}</p>
          <p className="text-sm leading-relaxed text-gray-600 md:text-base">{t('p2')}</p>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Why Dawah matters ────────────────────────────────────────────────── */
const WHY_CARDS: { key: string; icon: LucideIcon }[] = [
  { key: 'understanding', icon: Users },
  { key: 'character', icon: Sparkles },
  { key: 'community', icon: HeartHandshake },
];

export async function WhyDawahMatters() {
  const t = await getTranslations('dawah.about.why');
  return (
    <section className="bg-gray-50/60 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {WHY_CARDS.map(({ key, icon }) => (
            <div
              key={key}
              className="relative overflow-hidden rounded-lg border border-gray-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.03]" aria-hidden />
              <div className="relative">
                <IconChip icon={icon} />
                <h3 className="mt-5 text-lg font-bold text-gray-900">{t(`cards.${key}.title`)}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-500">
                  {t(`cards.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. Core principles ──────────────────────────────────────────────────── */
const PRINCIPLES: { key: string; icon: LucideIcon }[] = [
  { key: 'wisdom', icon: Compass },
  { key: 'compassion', icon: Heart },
  { key: 'knowledge', icon: GraduationCap },
  { key: 'character', icon: Sparkles },
  { key: 'patience', icon: Sprout },
];

export async function CorePrinciples() {
  const t = await getTranslations('dawah.about.principles');
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

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
                <h3 className="text-base font-bold text-gray-900">{t(`items.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  {t(`items.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. How Dawah is practiced ───────────────────────────────────────────── */
const PRACTICES: { key: string; icon: LucideIcon }[] = [
  { key: 'example', icon: UserCheck },
  { key: 'learning', icon: BookOpen },
  { key: 'conversation', icon: MessageCircle },
  { key: 'service', icon: HandHelping },
];

export async function HowPracticed() {
  const t = await getTranslations('dawah.about.practices');
  return (
    <section className="bg-gray-50/60 py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

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
                <h3 className="text-lg font-bold text-gray-900">{t(`items.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {t(`items.${key}.body`)}
                </p>
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

export async function DawahFaq() {
  const t = await getTranslations('dawah.about.faq');
  return (
    <section className="bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-10 space-y-3">
          {FAQ_KEYS.map((key) => (
            <details
              key={key}
              className="group rounded-lg border border-gray-200/70 bg-gray-50/50 p-5 transition-colors duration-200 hover:border-rmc-green/40 [&_summary]:list-none"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold text-gray-900">
                {t(`items.${key}.q`)}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rmc-green-light text-base leading-none text-rmc-green-dark transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{t(`items.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. Closing call-to-action ───────────────────────────────────────────── */
export async function DawahFinalCta({ locale }: { locale: string }) {
  const t = await getTranslations('dawah.about.cta');
  return (
    <section className="relative overflow-hidden bg-rmc-green-deep py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-[0.08]" aria-hidden />
      <div
        className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 rounded-full bg-rmc-gold/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rmc-gold">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{t('title')}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
          {t('subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/dawah/courses`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-rmc-green-deep shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-rmc-gold hover:text-white"
          >
            {t('primary')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-gold/60 hover:text-white"
          >
            {t('secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}

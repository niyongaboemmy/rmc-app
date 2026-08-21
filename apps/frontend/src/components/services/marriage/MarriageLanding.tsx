'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { BackToServices } from '@/components/services/BackToServices';
import {
  Heart,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  CalendarCheck,
  ShieldCheck,
  BookOpenCheck,
  ScrollText,
  Phone,
  Building2,
  MapPin,
  Wallet,
  Search,
  Plus,
} from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import {
  ContentKeys,
  MARRIAGE_DEFAULT,
  getSiteContent,
  marriageList,
  tri,
  isRtl,
  pick,
  raw,
  type Locale,
  type MarriageContent,
  type MarriageFaq,
  type MarriageItem,
  type MarriageRequirement,
} from '@/lib/content-api';

/**
 * Icon per "what's included" entry, keyed by the entry's stable id. An entry an admin
 * adds has no icon of its own, so it falls back to the generic one below.
 */
const includeIcons: Record<string, typeof BookOpenCheck> = {
  nikah: BookOpenCheck,
  certificate: ScrollText,
  guidance: Users,
  witness: ShieldCheck,
};

export default function MarriageLanding() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<MarriageContent>(
    ContentKeys.marriage,
    MARRIAGE_DEFAULT,
  );
  const lang = locale as Locale;

  // The raw saved blob, never merged, seeded from the server value so the first paint
  // is right without giving up the unmerged invariant.
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();
  const server = useServerSiteContent<MarriageContent>(ContentKeys.marriage);
  const [saved, setSaved] = useState<MarriageContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);
  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<MarriageContent>(ContentKeys.marriage)
      .then((data) => { if (active && data) setSaved(data); })
      .catch(() => { /* keep the seeded lists */ });
    return () => { active = false; };
  }, [refreshKey]);
  const draft = (store?.getOverride(ContentKeys.marriage) as MarriageContent | undefined) ?? saved;
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);

  /* Read UNMERGED — see `marriageList`. Every write below replaces the whole array,
     so the index-merged copy can never leak back in. */
  const includes = marriageList<MarriageItem>(draft?.includes?.items, MARRIAGE_DEFAULT.includes.items, 'inc');
  const steps = marriageList<MarriageItem>(draft?.process?.items, MARRIAGE_DEFAULT.process.items, 'step');
  const requirements = marriageList<MarriageRequirement>(draft?.requirements?.items, MARRIAGE_DEFAULT.requirements.items, 'req');
  const faqs = marriageList<MarriageFaq>(draft?.faq?.items, MARRIAGE_DEFAULT.faq.items, 'faq');

  const writeIncludes = (next: MarriageItem[]) => setField((d) => { d.includes.items = next; });
  const writeSteps = (next: MarriageItem[]) => setField((d) => { d.process.items = next; });
  const writeRequirements = (next: MarriageRequirement[]) => setField((d) => { d.requirements.items = next; });
  const writeFaqs = (next: MarriageFaq[]) => setField((d) => { d.faq.items = next; });

  const { bumpSeed } = useEditMode();

  /**
   * Reorder and delete, shared by all four lists. `bumpSeed` re-seeds the
   * index-keyed inline fields onto their new positions — without it the boxes keep
   * the text that used to sit at each index.
   */
  function move<T>(list: T[], write: (next: T[]) => void, i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
    bumpSeed();
  }

  function remove<T>(list: T[], write: (next: T[]) => void, i: number) {
    write(list.filter((_, idx) => idx !== i));
    bumpSeed();
  }

  /** Shared toolbar props for one entry of `list`. */
  function rowTools<T>(list: T[], write: (next: T[]) => void, i: number) {
    return {
      canMoveUp: i > 0,
      canMoveDown: i < list.length - 1,
      onMoveUp: () => move(list, write, i, -1),
      onMoveDown: () => move(list, write, i, 1),
      onDelete: () => remove(list, write, i),
    };
  }

  const addBtn = 'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-rmc-green hover:text-rmc-green';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ===================================================================
            HERO
        =================================================================== */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(42vh, 320px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80"
            alt="Islamic marriage celebration"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-rmc-green-deep/65 to-black/45" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          {/* Centered hero content */}
          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-4 pt-24">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-xl shadow-rmc-green-dark/50 ring-1 ring-white/20">
                  <Heart className="w-7 h-7 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <InlineText
                as="h1"
                lang={locale}
                value={pick(content.hero.title, locale)}
                editValue={raw(content.hero.title, locale)}
                onCommit={(v) => setField((d) => { d.hero.title[lang] = v; })}
                className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg"
                dir={dir}
                placeholder="Page title"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.hero.subtitle, locale)}
                editValue={raw(content.hero.subtitle, locale)}
                onCommit={(v) => setField((d) => { d.hero.subtitle[lang] = v; })}
                className="text-white/75 text-base max-w-2xl mx-auto leading-relaxed"
                dir={dir}
                placeholder="Short description"
              />
            </div>
          </div>

          {/* Back button — bottom of hero, always visible */}
          <BackToServices locale={locale} />
        </section>

        {/* ===================================================================
            OVERVIEW
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-7 lg:gap-10 items-center">
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80"
                  alt="Wedding rings"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/45 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -right-3 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2.5 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-sm">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <InlineText
                as="p"
                lang={locale}
                value={pick(content.overview.badge, locale)}
                editValue={raw(content.overview.badge, locale)}
                onCommit={(v) => setField((d) => { d.overview.badge[lang] = v; })}
                className="text-sm font-bold text-gray-900 leading-none"
                dir={dir}
                placeholder="Badge"
              />
                  <InlineText
                as="p"
                lang={locale}
                value={pick(content.overview.badgeSub, locale)}
                editValue={raw(content.overview.badgeSub, locale)}
                onCommit={(v) => setField((d) => { d.overview.badgeSub[lang] = v; })}
                className="text-xs text-gray-500 mt-0.5"
                dir={dir}
                placeholder="Badge note"
              />
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 bg-rmc-green-light text-rmc-green-dark px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-rmc-green-light">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(content.hero.badge, locale)}
                  editValue={raw(content.hero.badge, locale)}
                  onCommit={(v) => setField((d) => { d.hero.badge[lang] = v; })}
                  dir={dir}
                  placeholder="Pill"
                />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(content.overview.heading, locale)}
                  editValue={raw(content.overview.heading, locale)}
                  onCommit={(v) => setField((d) => { d.overview.heading[lang] = v; })}
                  dir={dir}
                  placeholder="Heading"
                />{' '}
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(content.overview.headingHighlight, locale)}
                  editValue={raw(content.overview.headingHighlight, locale)}
                  onCommit={(v) => setField((d) => { d.overview.headingHighlight[lang] = v; })}
                  className="text-rmc-green-dark"
                  dir={dir}
                  placeholder="Highlight"
                />
              </h2>
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.overview.p1, locale)}
                editValue={raw(content.overview.p1, locale)}
                onCommit={(v) => setField((d) => { d.overview.p1[lang] = v; })}
                className="text-gray-600 leading-relaxed mb-3 text-sm"
                dir={dir}
                placeholder="Paragraph"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.overview.p2, locale)}
                editValue={raw(content.overview.p2, locale)}
                onCommit={(v) => setField((d) => { d.overview.p2[lang] = v; })}
                className="text-gray-600 leading-relaxed mb-5 text-sm"
                dir={dir}
                placeholder="Paragraph"
              />
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href={`/${locale}/services/marriage/apply`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-rmc-green-dark/30 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                  {pick(content.hero.startLabel, locale)} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/services/marriage/status`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-rmc-green text-rmc-green-dark text-sm font-semibold rounded-lg hover:border-rmc-green hover:bg-rmc-green-light transition-all duration-200"
                >
                  <Search className="w-4 h-4" /> {pick(content.hero.statusLabel, locale)}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            WHAT'S INCLUDED
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-rmc-green-light/40 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <InlineText
                as="h2"
                lang={locale}
                value={pick(content.includes.title, locale)}
                editValue={raw(content.includes.title, locale)}
                onCommit={(v) => setField((d) => { d.includes.title[lang] = v; })}
                className="text-2xl font-bold text-gray-900 mb-2"
                dir={dir}
                placeholder="Heading"
              />
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.includes.subtitle, locale)}
                editValue={raw(content.includes.subtitle, locale)}
                onCommit={(v) => setField((d) => { d.includes.subtitle[lang] = v; })}
                className="text-gray-500 text-sm max-w-2xl mx-auto"
                dir={dir}
                placeholder="Subheading"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {includes.map((entry, i) => {
                const Icon = includeIcons[entry.id ?? ''] ?? CheckCircle2;
                return (
                  <div
                    key={entry.id}
                    className="group relative flex gap-4 bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-xl hover:shadow-rmc-green/10 hover:border-rmc-green hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-sm ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.25} />
                    </div>
                    <div>
                      <InlineText
                        as="h3"
                        lang={locale}
                        value={pick(entry.title, locale)}
                        editValue={raw(entry.title, locale)}
                        onCommit={(v) =>
                          writeIncludes(includes.map((x, idx) => (idx === i ? { ...x, title: { ...x.title, [lang]: v } } : x)))
                        }
                        className="font-bold text-gray-900 text-sm mb-1"
                        dir={dir}
                        placeholder="Title"
                      />
                      <InlineText
                        as="p"
                        lang={locale}
                        value={pick(entry.text, locale)}
                        editValue={raw(entry.text, locale)}
                        onCommit={(v) =>
                          writeIncludes(includes.map((x, idx) => (idx === i ? { ...x, text: { ...x.text, [lang]: v } } : x)))
                        }
                        className="text-gray-600 text-sm leading-relaxed"
                        dir={dir}
                        placeholder="Description"
                      />
                    </div>
                      {editing && (
                        <CardEditToolbar {...rowTools(includes, writeIncludes, i)} className="!right-1 !top-1 scale-90" />
                      )}
                  </div>
                );
              })}
              {editing && (
                <button
                  type="button"
                  onClick={() => writeIncludes([...includes, { id: `i${Date.now()}`, title: tri(''), text: tri('') }])}
                  className={addBtn}
                >
                  <Plus className="h-4 w-4" /> Add item
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================================
            PROCESS
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-7">
              <InlineText
                as="h2"
                lang={locale}
                value={pick(content.process.title, locale)}
                editValue={raw(content.process.title, locale)}
                onCommit={(v) => setField((d) => { d.process.title[lang] = v; })}
                className="text-2xl font-bold text-gray-900 mb-2"
                dir={dir}
                placeholder="Heading"
              />
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">
                {pick(content.process.subtitle, locale)}
              </p>
            </div>

            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-rmc-green via-rmc-green to-transparent" />
              <div className="space-y-4">
                {steps.map((entry, i) => (
                  <div key={entry.id} className="relative flex gap-5 items-start">
                    <div className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-bold flex items-center justify-center shadow-md shadow-rmc-green-dark/25 ring-4 ring-white">
                      {i + 1}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-rmc-green transition-all duration-200 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">
                        <InlineText
                        as="span"
                        lang={locale}
                        value={pick(entry.title, locale)}
                        editValue={raw(entry.title, locale)}
                        onCommit={(v) =>
                          writeSteps(steps.map((x, idx) => (idx === i ? { ...x, title: { ...x.title, [lang]: v } } : x)))
                        }
                        dir={dir}
                        placeholder="Step title"
                      />
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        <InlineText
                        as="span"
                        lang={locale}
                        value={pick(entry.text, locale)}
                        editValue={raw(entry.text, locale)}
                        onCommit={(v) =>
                          writeSteps(steps.map((x, idx) => (idx === i ? { ...x, text: { ...x.text, [lang]: v } } : x)))
                        }
                        dir={dir}
                        placeholder="Step description"
                      />
                      </p>
                    </div>
                      {editing && (
                        <CardEditToolbar {...rowTools(steps, writeSteps, i)} className="!right-1 !top-1 scale-90" />
                      )}
                  </div>
                ))}
                {editing && (
                  <button
                    type="button"
                    onClick={() => writeSteps([...steps, { id: `s${Date.now()}`, title: tri(''), text: tri('') }])}
                    className={addBtn}
                  >
                    <Plus className="h-4 w-4" /> Add step
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            REQUIREMENTS
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50/80 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-5">
              <div className="md:col-span-2 bg-gradient-to-br from-rmc-green to-rmc-green-dark p-6 text-white flex flex-col justify-center">
                <FileText className="w-8 h-8 mb-3 text-white/90" />
                <InlineText
                  as="h2"
                  lang={locale}
                  value={pick(content.requirements.title, locale)}
                  editValue={raw(content.requirements.title, locale)}
                  onCommit={(v) => setField((d) => { d.requirements.title[lang] = v; })}
                  className="text-xl font-bold mb-1.5"
                  dir={dir}
                  placeholder="Heading"
                />
                <p className="text-white/80 text-sm leading-relaxed">
                  {pick(content.requirements.subtitle, locale)}
                </p>
              </div>
              <div className="md:col-span-3 p-6">
                <ul className="space-y-3">
                  {requirements.map((entry, i) => (
                    <li key={entry.id} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-rmc-green shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">
                        <InlineText
                        as="span"
                        lang={locale}
                        value={pick(entry.text, locale)}
                        editValue={raw(entry.text, locale)}
                        onCommit={(v) =>
                          writeRequirements(requirements.map((x, idx) => (idx === i ? { ...x, text: { ...x.text, [lang]: v } } : x)))
                        }
                        dir={dir}
                        placeholder="Requirement"
                      />
                      </span>
                        {editing && (
                          <CardEditToolbar {...rowTools(requirements, writeRequirements, i)} className="!right-1 !top-1 scale-90" />
                        )}
                    </li>
                  ))}
                  {editing && (
                    <button
                      type="button"
                      onClick={() => writeRequirements([...requirements, { id: `r${Date.now()}`, text: tri('') }])}
                      className={addBtn}
                    >
                      <Plus className="h-4 w-4" /> Add requirement
                    </button>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SERVICE FEES & PAYMENT CLAUSE
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-rmc-green-light/40 pattern-light">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{pick(content.fees.title, locale)}</h2>
              <p className="text-gray-500 text-sm max-w-2xl mx-auto">{pick(content.fees.subtitle, locale)}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {/* Mosque */}
              <div className="relative bg-white border border-gray-100 rounded-lg p-5 shadow-sm overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-sm ring-1 ring-white/20 mb-4">
                  <Building2 className="w-5 h-5 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{pick(content.fees.mosqueAmount, locale)}</p>
                <p className="text-gray-500 text-sm mt-1.5">{pick(content.fees.mosqueLabel, locale)}</p>
              </div>
              {/* Outside */}
              <div className="relative bg-white border border-gray-100 rounded-lg p-5 shadow-sm overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shadow-sm ring-1 ring-white/20 mb-4">
                  <MapPin className="w-5 h-5 text-white" strokeWidth={2.25} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{pick(content.fees.outsideAmount, locale)}</p>
                <p className="text-gray-500 text-sm mt-1.5">{pick(content.fees.outsideLabel, locale)}</p>
              </div>
            </div>

            {/* Payment clause */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-5">
              <Wallet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 text-sm mb-1">
                  {pick(content.fees.clauseTitle, locale)}
                </h3>
                <p className="text-amber-900/80 text-sm leading-relaxed">
                  {pick(content.fees.clause, locale)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            FAQ
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <InlineText
                as="h2"
                lang={locale}
                value={pick(content.faq.title, locale)}
                editValue={raw(content.faq.title, locale)}
                onCommit={(v) => setField((d) => { d.faq.title[lang] = v; })}
                className="text-2xl font-bold text-gray-900 mb-2"
                dir={dir}
                placeholder="Heading"
              />
            </div>
            <div className="space-y-3">
              {faqs.map((entry, i) => (
                <details
                  key={entry.id}
                  className="group relative bg-white border border-gray-100 rounded-lg p-5 hover:border-rmc-green transition-colors duration-200 [&_summary]:list-none"
                >
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                    <InlineText
                        as="span"
                        lang={locale}
                        value={pick(entry.q, locale)}
                        editValue={raw(entry.q, locale)}
                        onCommit={(v) =>
                          writeFaqs(faqs.map((x, idx) => (idx === i ? { ...x, q: { ...x.q, [lang]: v } } : x)))
                        }
                        dir={dir}
                        placeholder="Question"
                      />
                    <span className="w-6 h-6 shrink-0 rounded-full bg-rmc-green-light text-rmc-green-dark flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-600 text-sm leading-relaxed mt-3">
                    <InlineText
                        as="span"
                        lang={locale}
                        value={pick(entry.a, locale)}
                        editValue={raw(entry.a, locale)}
                        onCommit={(v) =>
                          writeFaqs(faqs.map((x, idx) => (idx === i ? { ...x, a: { ...x.a, [lang]: v } } : x)))
                        }
                        dir={dir}
                        placeholder="Answer"
                      />
                  </p>
                    {editing && (
                      <CardEditToolbar {...rowTools(faqs, writeFaqs, i)} className="!right-1 !top-1 scale-90" />
                    )}
                </details>
              ))}
              {editing && (
                <button
                  type="button"
                  onClick={() => writeFaqs([...faqs, { id: `f${Date.now()}`, q: tri(''), a: tri('') }])}
                  className={addBtn}
                >
                  <Plus className="h-4 w-4" /> Add question
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================================
            CTA
        =================================================================== */}
        <section className="relative py-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=80"
            alt="Begin your marriage application"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/90 via-black/75 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-3">{pick(content.cta.title, locale)}</h2>
            <p className="text-white/60 mb-7 text-sm">{pick(content.cta.subtitle, locale)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/marriage/apply`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-rmc-green-dark/40 transition-all duration-200 hover:scale-105 active:scale-100"
              >
                {pick(content.cta.startLabel, locale)} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                <Phone className="w-4 h-4" /> {pick(content.cta.contactLabel, locale)}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

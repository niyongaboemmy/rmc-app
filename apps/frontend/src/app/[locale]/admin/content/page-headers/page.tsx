'use client';

/**
 * The banner copy at the top of the secondary pages, plus the About page's timeline
 * header — six sections, two or three fields each.
 *
 * One screen rather than six, because six near-empty pages would be worse to use
 * than one page of six cards, and an admin looking for "the words at the top of the
 * Contact page" does not know which of six routes to open.
 *
 * Each header is still its OWN `site_content` key — that separation exists so an
 * inline edit to one hero never clobbers another page's blob, and this screen keeps
 * it: only the sections actually touched are written on save.
 *
 * There is no Tenders header here. `/tenders` is a redirect stub and nothing renders
 * `tenders-hero`, so an editor for it would be a form that changes nothing.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Heading1 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  FallbackNote,
  LanguageTabs,
  TriFieldCard,
  setAtPath,
  type Lang,
  type TriFieldGroup,
} from '@/components/admin/content/TriFields';
import {
  ContentKeys,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  SERVICES_HERO_DEFAULT,
  CONTACT_HERO_DEFAULT,
  REGISTER_HERO_DEFAULT,
  NEW_MUSLIM_HERO_DEFAULT,
  GALLERY_HERO_DEFAULT,
  HISTORY_HEADER_DEFAULT,
} from '@/lib/content-api';

/** eyebrow / title / subtitle — the shape most of these share. */
const heroFields = (withEyebrow: boolean): TriFieldGroup['fields'] => [
  ...(withEyebrow
    ? [{ path: ['eyebrow'], label: 'Eyebrow', rows: 1, hint: 'The small pill above the heading. Clearing it hides the pill.' }]
    : []),
  { path: ['title'], label: 'Heading', rows: 1 },
  { path: ['subtitle'], label: 'Subheading', rows: 2 },
];

interface HeaderSection {
  key: string;
  title: string;
  note: string;
  defaults: unknown;
  fields: TriFieldGroup['fields'];
}

const SECTIONS: HeaderSection[] = [
  {
    key: ContentKeys.servicesHero,
    title: 'Services page',
    note: '/services — the banner above the list of services.',
    defaults: SERVICES_HERO_DEFAULT,
    fields: heroFields(true),
  },
  {
    key: ContentKeys.contactHero,
    title: 'Contact page',
    note: '/contact — the banner above the contact form; heading only, no eyebrow.',
    defaults: CONTACT_HERO_DEFAULT,
    fields: heroFields(false),
  },
  {
    key: ContentKeys.registerHero,
    title: 'Membership registration',
    note: '/member/register — the banner above the membership form.',
    defaults: REGISTER_HERO_DEFAULT,
    fields: heroFields(true),
  },
  {
    key: ContentKeys.newMuslimHero,
    title: 'Welcome to Islam page',
    note: '/new-muslim — the banner a brand-new Muslim lands on.',
    defaults: NEW_MUSLIM_HERO_DEFAULT,
    fields: heroFields(true),
  },
  {
    key: ContentKeys.galleryHero,
    title: 'Gallery page',
    note: '/gallery — heading only; this hero shows no eyebrow.',
    defaults: GALLERY_HERO_DEFAULT,
    fields: heroFields(false),
  },
  {
    key: ContentKeys.historyHeader,
    title: 'About — "RMC Through the Years"',
    note: 'The timeline section header on /about. The timeline entries themselves are separate records.',
    defaults: HISTORY_HEADER_DEFAULT,
    fields: [
      { path: ['title'], label: 'Heading', rows: 1, hint: 'The first part, in dark text.' },
      { path: ['accent'], label: 'Heading accent', rows: 1, hint: 'The last word or two, rendered in gold.' },
      { path: ['subtitle'], label: 'Subheading', rows: 2 },
    ],
  },
];

export default function PageHeadersContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <PageHeadersManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function PageHeadersManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);

  const initial = useMemo(
    () => Object.fromEntries(SECTIONS.map((s) => [s.key, s.defaults])),
    [],
  );
  const [forms, setForms] = useState<Record<string, unknown>>(initial);
  /** Only these get written on save — see the header note. */
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    Promise.all(
      SECTIONS.map((s) =>
        getSiteContent<Record<string, unknown>>(s.key)
          .then((data) => [s.key, data ? mergeContent(s.defaults, data) : s.defaults] as const)
          .catch(() => [s.key, s.defaults] as const),
      ),
    ).then((entries) => {
      if (active) setForms(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, []);

  // `path` already includes the language for a Tri field — see TriFieldCard.
  const handleChange = useCallback(
    (key: string, path: (string | number)[], next: string) => {
      setForms((prev) => ({ ...prev, [key]: setAtPath(prev[key], path, next) }));
      setDirty((prev) => new Set(prev).add(key));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (dirty.size === 0) {
      success('Nothing to save — no header has been changed.');
      return;
    }
    setSaving(true);
    // Array.from, not spread: the repo tsconfig sets no `target`, so plain `tsc`
    // compiles as ES5 and rejects iterating a Set.
    const changed = Array.from(dirty);
    const results = await Promise.all(
      changed.map((key) =>
        saveSiteContent(key, forms[key])
          .then(() => true)
          .catch(() => false),
      ),
    );
    const failed = changed.filter((_, i) => !results[i]);
    if (failed.length === 0) {
      setDirty(new Set());
      success(`Saved ${changed.length} header${changed.length === 1 ? '' : 's'}.`);
    } else {
      // Keep the failures dirty so a retry only re-sends what did not land.
      setDirty(new Set(failed));
      error(`Could not save ${failed.length} of ${changed.length}. Please try again.`);
    }
    setSaving(false);
  }, [dirty, forms, success, error]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
            <Heading1 className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Page Headers</h1>
            <p className="text-xs text-gray-400">
              The banner copy at the top of the Services, Contact, Membership, Welcome to
              Islam and Gallery pages, plus the About timeline header
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dirty.size > 0 ? `Save ${dirty.size} change${dirty.size === 1 ? '' : 's'}` : 'Save Changes'}
        </button>
      </div>

      <LanguageTabs lang={lang} onChange={setLang} />

      {SECTIONS.map((section) => (
        <TriFieldCard
          key={section.key}
          group={{
            title: section.title + (dirty.has(section.key) ? ' •' : ''),
            note: section.note,
            fields: section.fields,
          }}
          value={forms[section.key]}
          lang={lang}
          onChange={(path, next) => handleChange(section.key, path, next)}
        />
      ))}

      <FallbackNote />
    </div>
  );
}

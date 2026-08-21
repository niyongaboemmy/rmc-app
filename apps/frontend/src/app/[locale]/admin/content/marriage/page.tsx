'use client';

/**
 * Content → Marriage Page.
 *
 * The other door into the `marriage` blob; the same copy is editable in place on
 * /services/marriage in Edit Mode, and both write the same section.
 *
 * Bespoke rather than built on `TriSectionEditor` because this page has four
 * orderable lists, and that editor renders flat field groups only. The lists reuse the
 * shared `ListEditor`, and — as on the board editors — each is restored from the RAW
 * saved value on load: `mergeContent` merges arrays by index, so opening this form
 * after a deletion would otherwise show the entry that shifted up wearing the seeded
 * entry's translations, and saving would make that permanent.
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, ExternalLink, Heart, ListChecks, Wallet, HelpCircle, Megaphone, Layers } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  FallbackNote,
  LanguageTabs,
  ListEditor,
  TriFieldCard,
  readAtPath,
  setAtPath,
  type Lang,
  type TriFieldGroup,
} from '@/components/admin/content/TriFields';
import {
  ContentKeys,
  MARRIAGE_DEFAULT,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  marriageList,
  tri,
  type MarriageContent,
  type MarriageFaq,
  type MarriageItem,
  type MarriageRequirement,
} from '@/lib/content-api';

/** The fixed fields, in the order they appear on the page. */
const GROUPS: TriFieldGroup[] = [
  {
    title: 'Hero',
    icon: Heart,
    fields: [
      { path: ['hero', 'badge'], label: 'Pill above the heading', rows: 1 },
      { path: ['hero', 'title'], label: 'Heading', rows: 1 },
      { path: ['hero', 'subtitle'], label: 'Standfirst', rows: 3 },
      { path: ['hero', 'startLabel'], label: 'Apply button', rows: 1 },
      { path: ['hero', 'statusLabel'], label: 'Check-status button', rows: 1 },
    ],
  },
  {
    title: 'Overview',
    icon: Megaphone,
    note: 'The two-column block beside the photo.',
    fields: [
      { path: ['overview', 'heading'], label: 'Heading', rows: 1 },
      {
        path: ['overview', 'headingHighlight'], label: 'Heading — gold part', rows: 1,
        hint: 'Rendered in gold immediately after the heading.',
      },
      { path: ['overview', 'p1'], label: 'First paragraph', rows: 3 },
      { path: ['overview', 'p2'], label: 'Second paragraph', rows: 3 },
      { path: ['overview', 'badge'], label: 'Photo badge', rows: 1 },
      { path: ['overview', 'badgeSub'], label: 'Photo badge — note', rows: 1 },
    ],
  },
  {
    title: "What's included",
    icon: Layers,
    fields: [
      { path: ['includes', 'title'], label: 'Heading', rows: 1 },
      { path: ['includes', 'subtitle'], label: 'Subheading', rows: 2 },
    ],
  },
  {
    title: 'How it works',
    icon: ListChecks,
    fields: [
      { path: ['process', 'title'], label: 'Heading', rows: 1 },
      { path: ['process', 'subtitle'], label: 'Subheading', rows: 2 },
    ],
  },
  {
    title: "What you'll need",
    icon: ListChecks,
    fields: [
      { path: ['requirements', 'title'], label: 'Heading', rows: 1 },
      { path: ['requirements', 'subtitle'], label: 'Subheading', rows: 2 },
    ],
  },
  {
    title: 'Service fees',
    icon: Wallet,
    note: 'Amounts are text, so each language can carry its own currency wording.',
    fields: [
      { path: ['fees', 'title'], label: 'Heading', rows: 1 },
      { path: ['fees', 'subtitle'], label: 'Subheading', rows: 2 },
      { path: ['fees', 'mosqueLabel'], label: 'Mosque ceremony — label', rows: 1 },
      { path: ['fees', 'mosqueAmount'], label: 'Mosque ceremony — amount', rows: 1 },
      { path: ['fees', 'outsideLabel'], label: 'Outside ceremony — label', rows: 1 },
      { path: ['fees', 'outsideAmount'], label: 'Outside ceremony — amount', rows: 1 },
      { path: ['fees', 'clauseTitle'], label: 'Clause — heading', rows: 1 },
      { path: ['fees', 'clause'], label: 'Clause — text', rows: 3 },
    ],
  },
  {
    title: 'Frequently asked questions',
    icon: HelpCircle,
    fields: [{ path: ['faq', 'title'], label: 'Heading', rows: 1 }],
  },
  {
    title: 'Closing call to action',
    icon: Megaphone,
    fields: [
      { path: ['cta', 'title'], label: 'Heading', rows: 1 },
      { path: ['cta', 'subtitle'], label: 'Message', rows: 2 },
      { path: ['cta', 'startLabel'], label: 'Primary button', rows: 1 },
      { path: ['cta', 'contactLabel'], label: 'Secondary button', rows: 1 },
    ],
  },
];

export default function MarriageContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <MarriageContentManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function MarriageContentManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<MarriageContent>(MARRIAGE_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.marriage)
      .then((data) => {
        if (!data) return;
        const merged = mergeContent(MARRIAGE_DEFAULT, data);
        const rawBlob = data as unknown as Partial<MarriageContent>;
        // Restore the four lists from the RAW value — see the header note.
        setForm({
          ...merged,
          includes: { ...merged.includes, items: marriageList<MarriageItem>(rawBlob.includes?.items, merged.includes.items, 'inc') },
          process: { ...merged.process, items: marriageList<MarriageItem>(rawBlob.process?.items, merged.process.items, 'step') },
          requirements: { ...merged.requirements, items: marriageList<MarriageRequirement>(rawBlob.requirements?.items, merged.requirements.items, 'req') },
          faq: { ...merged.faq, items: marriageList<MarriageFaq>(rawBlob.faq?.items, merged.faq.items, 'faq') },
        });
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  // `path` already includes the language for a Tri field — see TriFieldCard.
  const handleChange = useCallback((path: (string | number)[], next: string) => {
    setForm((prev) => setAtPath(prev, path, next));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.marriage, form);
      success('Marriage page content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? ('rtl' as const) : ('ltr' as const);
  const inputClass = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${lang === 'ar' ? 'font-arabic' : ''}`;

  /** One list's mutators, so the four blocks below stay declarative. */
  function listOps<T extends { id?: string }>(
    key: 'includes' | 'process' | 'requirements' | 'faq',
    blank: () => T,
  ) {
    const write = (fn: (items: T[]) => T[]) =>
      setForm((prev) => {
        const section = prev[key] as unknown as { items: T[] };
        return { ...prev, [key]: { ...section, items: fn(section.items) } };
      });
    return {
      onAdd: () => write((items) => [...items, blank()]),
      onRemove: (i: number) => write((items) => items.filter((_, idx) => idx !== i)),
      onMove: (i: number, delta: -1 | 1) =>
        write((items) => {
          const j = i + delta;
          if (j < 0 || j >= items.length) return items;
          const next = [...items];
          [next[i], next[j]] = [next[j], next[i]];
          return next;
        }),
    };
  }

  const shared = {
    lang,
    dir,
    inputClass,
    read: (path: (string | number)[]) => readAtPath(form, path),
    onFieldChange: (path: (string | number)[], value: string) =>
      handleChange([...path, lang], value),
  };

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Marriage Page</h1>
            <p className="text-xs text-gray-400">
              Every heading, blurb, list entry and button on /services/marriage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/services/marriage`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
          >
            <ExternalLink className="h-4 w-4" /> View page
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <LanguageTabs lang={lang} onChange={setLang} />

      {GROUPS.map((group) => (
        <div key={group.title}>
          <TriFieldCard group={group} value={form} lang={lang} onChange={handleChange} />

          {group.title === "What's included" && (
            <ListEditor
              noun="Item"
              emptyNote="No items. The section hides its grid until you add one."
              addLabel="Add item"
              ids={form.includes.items.map((x) => x.id)}
              basePath={['includes', 'items']}
              fields={[
                { key: 'title', label: 'Title', rows: 1 },
                { key: 'text', label: 'Description', rows: 2 },
              ]}
              {...shared}
              {...listOps<MarriageItem>('includes', () => ({ id: `i${Date.now()}`, title: tri(''), text: tri('') }))}
            />
          )}

          {group.title === 'How it works' && (
            <ListEditor
              noun="Step"
              emptyNote="No steps. The timeline hides itself until you add one."
              addLabel="Add step"
              ids={form.process.items.map((x) => x.id)}
              basePath={['process', 'items']}
              fields={[
                { key: 'title', label: 'Title', rows: 1 },
                { key: 'text', label: 'Description', rows: 2 },
              ]}
              {...shared}
              {...listOps<MarriageItem>('process', () => ({ id: `s${Date.now()}`, title: tri(''), text: tri('') }))}
            />
          )}

          {group.title === "What you'll need" && (
            <ListEditor
              noun="Requirement"
              emptyNote="No requirements. The list hides itself until you add one."
              addLabel="Add requirement"
              ids={form.requirements.items.map((x) => x.id)}
              basePath={['requirements', 'items']}
              fields={[{ key: 'text', label: 'Requirement', rows: 2 }]}
              {...shared}
              {...listOps<MarriageRequirement>('requirements', () => ({ id: `r${Date.now()}`, text: tri('') }))}
            />
          )}

          {group.title === 'Frequently asked questions' && (
            <ListEditor
              noun="Question"
              emptyNote="No questions. The FAQ hides itself until you add one."
              addLabel="Add question"
              ids={form.faq.items.map((x) => x.id)}
              basePath={['faq', 'items']}
              fields={[
                { key: 'q', label: 'Question', rows: 1 },
                { key: 'a', label: 'Answer', rows: 3 },
              ]}
              {...shared}
              {...listOps<MarriageFaq>('faq', () => ({ id: `f${Date.now()}`, q: tri(''), a: tri('') }))}
            />
          )}
        </div>
      ))}

      <FallbackNote />
    </div>
  );
}

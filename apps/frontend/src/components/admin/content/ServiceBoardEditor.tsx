'use client';

/**
 * Dashboard editor for the three service boards — Tenders, Jobs and Scholarships.
 *
 * One component rather than three near-identical pages, for the same reason the
 * public side shares `ServiceBoardCopy`: the boards are the same page, and the
 * `ServiceBoardContent` shape says so. Each route passes its section key, defaults
 * and chrome; scholarship additionally carries `faq` and `cta`, which this renders
 * when the blob has them.
 *
 * The copy is also inline-editable on the live page in Edit Mode. This is the other
 * door into the same `site_content` blob, for admins who work from the dashboard —
 * both write the same key, so an edit made in either shows up in the other.
 *
 * Steps and the scholarship FAQ can be added, removed and reordered — the same as in
 * Edit Mode, so neither door can do something the other cannot. That needs care on
 * LOAD: the saved blob is merged over the defaults for everything else, but both
 * arrays are then restored from the RAW value via `boardSteps()` / `boardFaqs()`.
 * Without that, an admin who had deleted an entry would open this form and find the
 * one that shifted up wearing the seeded entry's translations — and saving would make
 * that permanent.
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Save, Loader2, ExternalLink, ListOrdered, Megaphone, HelpCircle, Layers,
  Plus, Trash2, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  boardFaqs,
  boardSteps,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  tri,
  type BoardStep,
  type ScholarshipServiceContent,
  type ServiceBoardContent,
} from '@/lib/content-api';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

/** A `Tri` somewhere in the blob, addressed by the path that reaches it. */
interface FieldDef {
  path: (string | number)[];
  label: string;
  rows: number;
  hint?: string;
}

interface FieldGroup {
  title: string;
  icon: React.ElementType;
  fields: FieldDef[];
  /** Render the add / remove / reorder step list under this group's fields. */
  stepsEditor?: boolean;
  /** Same, for the scholarship FAQ. */
  faqEditor?: boolean;
}

/** Immutable set of `obj` at `path`, cloning only the nodes along the way. */
function setAtPath<T>(obj: T, path: (string | number)[], value: string): T {
  const [head, ...rest] = path;
  const clone: unknown = Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as object) };
  const target = clone as Record<string | number, unknown>;
  target[head] = rest.length
    ? setAtPath(target[head] as unknown, rest, value)
    : value;
  return clone as T;
}

function readAtPath(obj: unknown, path: (string | number)[]): string {
  const v = path.reduce<unknown>((a, k) => (a as Record<string | number, unknown>)?.[k], obj);
  return typeof v === 'string' ? v : '';
}

/** Has the wider scholarship shape? */
function hasExtras(v: ServiceBoardContent): v is ScholarshipServiceContent {
  return 'faq' in v && 'cta' in v;
}

/**
 * An orderable list of entries, each a couple of `Tri` fields — the steps rail and
 * the scholarship FAQ are the same widget with different nouns.
 */
function ListEditor({
  noun,
  emptyNote,
  addLabel,
  ids,
  basePath,
  fields,
  lang,
  dir,
  inputClass,
  read,
  onFieldChange,
  onAdd,
  onRemove,
  onMove,
}: {
  noun: string;
  emptyNote: string;
  addLabel: string;
  /** One entry per list item; only the length and the React keys are used. */
  ids: (string | undefined)[];
  basePath: (string | number)[];
  fields: { key: string; label: string; rows: number }[];
  lang: Lang;
  dir: 'ltr' | 'rtl';
  inputClass: string;
  read: (path: (string | number)[]) => string;
  onFieldChange: (path: (string | number)[], value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: -1 | 1) => void;
}) {
  const ctrl =
    'grid h-7 w-7 place-items-center rounded-md text-gray-400 transition-colors hover:bg-white hover:text-gray-700 disabled:opacity-30';

  return (
    <div className="space-y-3 border-t border-gray-50 pt-4">
      {ids.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
          {emptyNote}
        </p>
      )}

      {ids.map((id, i) => (
        <div key={id ?? i} className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rmc-green text-[10px] text-white">
                {i + 1}
              </span>
              {noun} {i + 1}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                className={ctrl}
                aria-label={`Move ${noun.toLowerCase()} up`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(i, 1)}
                disabled={i === ids.length - 1}
                className={ctrl}
                aria-label={`Move ${noun.toLowerCase()} down`}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="grid h-7 w-7 place-items-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${noun.toLowerCase()}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>

          {fields.map((f) => {
            const path = [...basePath, i, f.key];
            return (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{f.label}</label>
                {f.rows === 1 ? (
                  <input
                    dir={dir}
                    type="text"
                    value={read([...path, lang])}
                    onChange={(e) => onFieldChange(path, e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <textarea
                    dir={dir}
                    rows={f.rows}
                    value={read([...path, lang])}
                    onChange={(e) => onFieldChange(path, e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-rmc-green hover:text-rmc-green"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

/**
 * Field groups derived from the blob itself, so the step and FAQ lists grow with the
 * content instead of being hard-coded to today's counts.
 */
function buildGroups(form: ServiceBoardContent): FieldGroup[] {
  const groups: FieldGroup[] = [
    {
      title: 'Hero',
      icon: Megaphone,
      fields: [
        { path: ['hero', 'title'], label: 'Heading', rows: 1 },
        { path: ['hero', 'subtitle'], label: 'Standfirst', rows: 2 },
      ],
    },
    {
      title: 'Above the list',
      icon: Layers,
      fields: [
        { path: ['browse', 'title'], label: 'Heading', rows: 1 },
        {
          path: ['browse', 'note'], label: 'Note', rows: 3,
          hint: 'Sits directly above the records and explains what the reader is looking at.',
        },
      ],
    },
    {
      title: 'How to apply',
      icon: ListOrdered,
      // The steps themselves are rendered by the dedicated editor below, which owns
      // the add / remove / reorder controls a flat field list cannot offer.
      fields: [{ path: ['steps', 'title'], label: 'Heading', rows: 1 }],
      stepsEditor: true,
    },
  ];

  if (hasExtras(form)) {
    groups.push(
      {
        title: 'Frequently asked questions',
        icon: HelpCircle,
        // The questions are rendered by the dedicated editor below, which owns the
        // add / remove / reorder controls a flat field list cannot offer.
        fields: [{ path: ['faq', 'title'], label: 'Heading', rows: 1 }],
        faqEditor: true,
      },
      {
        title: 'Closing call to action',
        icon: Megaphone,
        fields: [
          { path: ['cta', 'title'], label: 'Heading', rows: 1 },
          { path: ['cta', 'subtitle'], label: 'Supporting line', rows: 2 },
          { path: ['cta', 'startLabel'], label: 'Primary button label', rows: 1 },
          { path: ['cta', 'contactLabel'], label: 'Secondary button label', rows: 1 },
        ],
      },
    );
  }

  return groups;
}

export interface ServiceBoardEditorProps {
  sectionKey: string;
  defaults: ServiceBoardContent | ScholarshipServiceContent;
  /** Shown in the page header. */
  title: string;
  blurb: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  /** Path of the public page this edits, relative to the locale. */
  publicPath: string;
  /** What the records on that page are called, for the pointer to their CRUD screen. */
  recordsLabel: string;
  recordsHref: string;
  recordsNote: string;
}

export function ServiceBoardEditor({
  sectionKey,
  defaults,
  title,
  blurb,
  icon: Icon,
  iconBg,
  iconColor,
  publicPath,
  recordsLabel,
  recordsHref,
  recordsNote,
}: ServiceBoardEditorProps) {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<ServiceBoardContent>(defaults);
  const [saving, setSaving] = useState(false);

  // Merged over the seeded defaults, so a section never saved still edits sensibly.
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(sectionKey)
      .then((data) => {
        if (!data) return;
        const merged = mergeContent(defaults, data);
        // Restore the list arrays from the RAW value — see the header note. Merging
        // them by index is exactly what would put a deleted entry's seeded
        // translations onto the entry that shifted into its place.
        const repaired: ServiceBoardContent = {
          ...merged,
          steps: { ...merged.steps, items: boardSteps(data, defaults) },
        };
        if (hasExtras(repaired)) {
          const withFaq: ScholarshipServiceContent = {
            ...repaired,
            faq: { ...repaired.faq, items: boardFaqs(data, repaired) },
          };
          setForm(withFaq);
        } else {
          setForm(repaired);
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [sectionKey, defaults]);

  const addStep = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        items: [...prev.steps.items, { id: `s${Date.now()}`, title: tri(''), text: tri('') }],
      },
    }));
  }, []);

  const removeStep = useCallback((i: number) => {
    setForm((prev) => ({
      ...prev,
      steps: { ...prev.steps, items: prev.steps.items.filter((_, idx) => idx !== i) },
    }));
  }, []);

  const moveStep = useCallback((i: number, delta: -1 | 1) => {
    setForm((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.steps.items.length) return prev;
      const items = [...prev.steps.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...prev, steps: { ...prev.steps, items } };
    });
  }, []);

  /* The FAQ is scholarship-only; these are no-ops on a board without one. */
  const addFaq = useCallback(() => {
    setForm((prev) =>
      hasExtras(prev)
        ? { ...prev, faq: { ...prev.faq, items: [...prev.faq.items, { id: `f${Date.now()}`, q: tri(''), a: tri('') }] } }
        : prev,
    );
  }, []);

  const removeFaq = useCallback((i: number) => {
    setForm((prev) =>
      hasExtras(prev)
        ? { ...prev, faq: { ...prev.faq, items: prev.faq.items.filter((_, idx) => idx !== i) } }
        : prev,
    );
  }, []);

  const moveFaq = useCallback((i: number, delta: -1 | 1) => {
    setForm((prev) => {
      if (!hasExtras(prev)) return prev;
      const j = i + delta;
      if (j < 0 || j >= prev.faq.items.length) return prev;
      const items = [...prev.faq.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...prev, faq: { ...prev.faq, items } };
    });
  }, []);

  const setField = useCallback((path: (string | number)[], l: Lang, value: string) => {
    setForm((prev) => setAtPath(prev, [...path, l], value));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(sectionKey, form);
      success(`${title} content saved successfully.`);
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [sectionKey, form, title, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const inputClass = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${fontClass}`;
  const groups = buildGroups(form);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/30 hover:text-rmc-green"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-400">{blurb}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}${publicPath}`}
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

      {/* Pointer to the records screen — this editor is the page's wording only. */}
      <Link
        href={`/${locale}${recordsHref}`}
        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-rmc-green/30"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rmc-gold/15 text-rmc-gold">
          <Layers className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{recordsLabel}</span>
          <span className="block text-xs text-gray-400">{recordsNote} →</span>
        </span>
      </Link>

      {/* Language tabs */}
      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        {LANGS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLang(l.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-150 ${
              lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div key={group.title} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="flex items-center gap-2 border-b border-gray-50 pb-3 text-sm font-bold text-gray-700">
            <group.icon className="h-4 w-4 text-rmc-green" />
            {group.title}
            <span className="font-normal text-gray-400">
              — {LANGS.find((l) => l.key === lang)?.label}
            </span>
          </h2>

          {group.fields.map(({ path, label, rows, hint }) => {
            const value = readAtPath(form, [...path, lang]);
            const id = [...path, lang].join('.');
            return (
              <div key={id}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
                {rows === 1 ? (
                  <input
                    dir={dir}
                    type="text"
                    value={value}
                    onChange={(e) => setField(path, lang, e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <textarea
                    dir={dir}
                    rows={rows}
                    value={value}
                    onChange={(e) => setField(path, lang, e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                )}
                {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
              </div>
            );
          })}

          {group.stepsEditor && (
            <ListEditor
              noun="Step"
              emptyNote="No steps. The rail hides its list until you add one."
              addLabel="Add step"
              ids={form.steps.items.map((s) => s.id)}
              basePath={['steps', 'items']}
              fields={[
                { key: 'title', label: 'Title', rows: 1 },
                { key: 'text', label: 'Description', rows: 2 },
              ]}
              lang={lang}
              dir={dir}
              inputClass={inputClass}
              read={(path) => readAtPath(form, path)}
              onFieldChange={(path, value) => setField(path, lang, value)}
              onAdd={addStep}
              onRemove={removeStep}
              onMove={moveStep}
            />
          )}

          {group.faqEditor && hasExtras(form) && (
            <ListEditor
              noun="Question"
              emptyNote="No questions. The FAQ section hides itself until you add one."
              addLabel="Add question"
              ids={form.faq.items.map((f) => f.id)}
              basePath={['faq', 'items']}
              fields={[
                { key: 'q', label: 'Question', rows: 1 },
                { key: 'a', label: 'Answer', rows: 3 },
              ]}
              lang={lang}
              dir={dir}
              inputClass={inputClass}
              read={(path) => readAtPath(form, path)}
              onFieldChange={(path, value) => setField(path, lang, value)}
              onAdd={addFaq}
              onRemove={removeFaq}
              onMove={moveFaq}
            />
          )}
        </div>
      ))}

      <p className="text-[11px] text-gray-400">
        Empty translations fall back to English on the public page. The same copy is
        editable in place on the live page in Edit Mode.
      </p>
    </div>
  );
}

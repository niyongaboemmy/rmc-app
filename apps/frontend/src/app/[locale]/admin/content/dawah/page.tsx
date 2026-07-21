'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  ContentKeys, getSiteContent, saveSiteContent, mergeContent,
  DAWAH_DEFAULT, type DawahContent, type Tri,
} from '@/lib/content-api';
import {
  GraduationCap, ArrowLeft, Save, Sparkles, BookText, LayoutGrid, Loader2,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

interface FieldDef {
  /** Dotted path to the Tri inside DawahContent, e.g. 'cta.courses.eyebrow'. */
  path: string;
  label: string;
  /** 1 → single-line input; >1 → textarea. Ignored when `rich` is set. */
  rows: number;
  rich?: boolean;
  hint?: string;
}

interface SectionDef {
  key: string;
  label: string;
  icon: 'hero' | 'about' | 'grid';
  fields: FieldDef[];
}

// One entry per prose block on /dawah — worded so the form reads like the page.
const SECTIONS: SectionDef[] = [
  {
    key: 'hero', label: 'Hero', icon: 'hero',
    fields: [
      { path: 'hero.eyebrow', label: 'Eyebrow', rows: 1 },
      { path: 'hero.title', label: 'Title', rows: 1 },
      { path: 'hero.subtitle', label: 'Subtitle', rows: 2 },
    ],
  },
  {
    key: 'description', label: 'Description', icon: 'about',
    fields: [
      { path: 'description.eyebrow', label: 'Eyebrow', rows: 1 },
      { path: 'description.title', label: 'Heading', rows: 1 },
      {
        path: 'description.body', label: 'Body', rows: 0, rich: true,
        hint: 'The prose block under the hero. Clearing the English body hides the section on the public page.',
      },
    ],
  },
  {
    key: 'courses', label: 'Courses section heading', icon: 'grid',
    fields: [
      { path: 'courses.eyebrow', label: 'Eyebrow', rows: 1 },
      { path: 'courses.title', label: 'Heading', rows: 1 },
      { path: 'courses.subtitle', label: 'Subheading', rows: 2 },
      { path: 'courses.cta', label: 'Button under the featured grid', rows: 1 },
    ],
  },
  {
    key: 'cta.courses', label: 'Footer card — Courses', icon: 'grid',
    fields: [
      { path: 'cta.courses.eyebrow', label: 'Eyebrow', rows: 1 },
      { path: 'cta.courses.title', label: 'Title', rows: 1 },
      { path: 'cta.courses.subtitle', label: 'Subtitle', rows: 2 },
      { path: 'cta.courses.action', label: 'Button label', rows: 1 },
    ],
  },
  {
    key: 'cta.library', label: 'Footer card — Library', icon: 'grid',
    fields: [
      { path: 'cta.library.eyebrow', label: 'Eyebrow', rows: 1 },
      { path: 'cta.library.title', label: 'Title', rows: 1 },
      { path: 'cta.library.subtitle', label: 'Subtitle', rows: 2 },
      { path: 'cta.library.action', label: 'Button label', rows: 1 },
    ],
  },
];

/** Read/replace a nested value by dotted path, immutably. */
function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}
function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as Record<string, unknown>) };
  let cursor = clone as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cursor[k] = { ...(cursor[k] as Record<string, unknown>) };
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

export default function DawahContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><DawahContentManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function DawahContentManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<DawahContent>(DAWAH_DEFAULT);
  const [saving, setSaving] = useState(false);

  // Merged over the seeded defaults, so a blank translation falls back to English.
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.dawah)
      .then((data) => { if (data) setForm(mergeContent(DAWAH_DEFAULT, data)); })
      .catch(() => { /* keep defaults */ });
  }, []);

  const setTri = useCallback((path: string, l: Lang, value: string) => {
    setForm((prev) => {
      const current = getAtPath(prev, path) as Tri;
      return setAtPath(prev, path, { ...current, [l]: value });
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.dawah, form);
      success('Dawah landing content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const inputClass = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${fontClass}`;

  const SectionIcon = ({ icon }: { icon: SectionDef['icon'] }) =>
    icon === 'hero' ? <Sparkles className="h-4 w-4 text-rmc-green" />
      : icon === 'about' ? <BookText className="h-4 w-4 text-rmc-green" />
        : <LayoutGrid className="h-4 w-4 text-rmc-green" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/30 hover:text-rmc-green">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rmc-green/10">
            <GraduationCap className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dawah Learning</h1>
            <p className="text-xs text-gray-400">The hero, description and footer cards on the public Dawah page. Courses and books are managed separately.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Language tabs */}
      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        {LANGS.map((l) => (
          <button key={l.key} onClick={() => setLang(l.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-150 ${lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>

      {/* Tri-lingual copy, one card per section */}
      {SECTIONS.map((section) => (
        <div key={section.key} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="flex items-center gap-2 border-b border-gray-50 pb-3 text-sm font-bold text-gray-700">
            <SectionIcon icon={section.icon} />
            {section.label}
            <span className="font-normal text-gray-400">— {LANGS.find((l) => l.key === lang)?.label}</span>
          </h2>

          {section.fields.map((f) => {
            const value = (getAtPath(form, f.path) as Tri)[lang];
            return (
              <div key={f.path}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{f.label}</label>
                {f.rich ? (
                  // Remounted per language: the editor only seeds its content once,
                  // so without a key the English body would leak into rw/ar.
                  <RichTextEditor
                    key={`${f.path}-${lang}`}
                    value={value}
                    onChange={(html) => setTri(f.path, lang, html)}
                    dir={dir}
                    fontClassName={fontClass}
                  />
                ) : f.rows === 1 ? (
                  <input dir={dir} type="text" value={value} onChange={(e) => setTri(f.path, lang, e.target.value)} className={inputClass} />
                ) : (
                  <textarea dir={dir} rows={f.rows} value={value} onChange={(e) => setTri(f.path, lang, e.target.value)} className={`${inputClass} resize-none`} />
                )}
                {f.hint && <p className="mt-1 text-[11px] text-gray-400">{f.hint}</p>}
              </div>
            );
          })}
        </div>
      ))}

      <p className="text-[11px] text-gray-400">Empty translations fall back to English on the public page.</p>
    </div>
  );
}

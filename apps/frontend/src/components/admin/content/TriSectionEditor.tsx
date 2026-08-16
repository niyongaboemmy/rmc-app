'use client';

/**
 * Dashboard editor for a section that is nothing but tri-lingual copy.
 *
 * The Dawah listings (Library, Courses, Discussions) are each a heading plus the
 * messages shown when the list is empty or the API is down — no records, no images,
 * no ordering. That is a form the caller can describe entirely with field paths, so
 * this renders it and they declare it.
 *
 * Sections with records, media or ordering need their own screen; this is for the
 * ones where a generic form is the honest answer rather than a compromise.
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { getSiteContent, saveSiteContent, mergeContent } from '@/lib/content-api';
import {
  FallbackNote,
  LanguageTabs,
  TriFieldCard,
  setAtPath,
  type Lang,
  type TriFieldGroup,
} from './TriFields';

export interface TriSectionEditorProps<T> {
  sectionKey: string;
  defaults: T;
  /**
   * The form's shape. Pass a function when the field list depends on the content —
   * a section whose steps or items an admin can grow should not be pinned to the
   * count that happened to be seeded.
   */
  groups: TriFieldGroup[] | ((form: T) => TriFieldGroup[]);
  title: string;
  blurb: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  /** Path of the public page this edits, relative to the locale. */
  publicPath: string;
  /** Optional pointer to the screen that manages the records this page lists. */
  records?: { label: string; href: string; note: string };
}

export function TriSectionEditor<T>({
  sectionKey,
  defaults,
  groups: groupsProp,
  title,
  blurb,
  icon: Icon,
  iconBg,
  iconColor,
  publicPath,
  records,
}: TriSectionEditorProps<T>) {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<T>(defaults);
  const [saving, setSaving] = useState(false);

  // Merged over the seeded defaults, so a section never saved still edits sensibly.
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(sectionKey)
      .then((data) => {
        if (data) setForm(mergeContent(defaults, data));
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [sectionKey, defaults]);

  // `path` already includes the language for a Tri field — see TriFieldCard.
  const handleChange = useCallback((path: (string | number)[], next: string) => {
    setForm((prev) => setAtPath(prev, path, next));
  }, []);

  const groups = typeof groupsProp === 'function' ? groupsProp(form) : groupsProp;

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

      {records && (
        <Link
          href={`/${locale}${records.href}`}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-rmc-green/30"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">{records.label}</span>
            <span className="block text-xs text-gray-400">{records.note} →</span>
          </span>
        </Link>
      )}

      <LanguageTabs lang={lang} onChange={setLang} />

      {groups.map((group) => (
        <TriFieldCard
          key={group.title}
          group={group}
          value={form}
          lang={lang}
          onChange={handleChange}
        />
      ))}

      <FallbackNote />
    </div>
  );
}

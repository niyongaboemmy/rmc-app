'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys, getSiteContent, saveSiteContent, mergeContent, hajjPhotoSrc,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { uploadAreaImage } from '@/lib/galleryApi';
import {
  Compass, ArrowLeft, Save, Sparkles, BookOpen, ImageIcon, Upload, ListChecks, Loader2,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

/** Which nested group a field lives in, and how tall its input should be. */
type Group = keyof HajjContent;
interface FieldDef {
  group: Group;
  key: string;
  label: string;
  /** 1 → single-line input; more → textarea. Ignored when `rich` is set. */
  rows: number;
  /** Edit as HTML in the rich-text editor instead of a plain textarea. */
  rich?: boolean;
  hint?: string;
}

const FIELDS: FieldDef[] = [
  { group: 'hero', key: 'eyebrow', label: 'Hero — Eyebrow', rows: 1 },
  { group: 'hero', key: 'title', label: 'Hero — Title', rows: 2 },
  { group: 'hero', key: 'subtitle', label: 'Hero — Subtitle', rows: 2 },
  {
    group: 'hero', key: 'talbiyahMeaning', label: 'Hero — Talbiyah meaning', rows: 1,
    hint: 'Shown under the Arabic Talbiyah. The Talbiyah itself is scripture and is not editable.',
  },
  { group: 'about', key: 'eyebrow', label: 'About — Eyebrow', rows: 1 },
  { group: 'about', key: 'title', label: 'About — Title', rows: 2 },
  { group: 'about', key: 'description', label: 'About — Description', rows: 5 },
  { group: 'about', key: 'incentive', label: 'About — Incentive callout', rows: 4 },
  { group: 'about', key: 'cta', label: 'About — Register button', rows: 1 },
  { group: 'about', key: 'photoAlt', label: 'About — Photo alt text', rows: 1, hint: 'Describes the photo for screen readers.' },
  { group: 'description', key: 'eyebrow', label: 'Description — Eyebrow', rows: 1 },
  { group: 'description', key: 'title', label: 'Description — Heading', rows: 1 },
  {
    group: 'description', key: 'body', label: 'Description — Body', rows: 0, rich: true,
    hint: 'Formatted text shown between the About section and the requirements. Clearing the English body hides the section on the public page.',
  },
  { group: 'requirements', key: 'eyebrow', label: 'Requirements — Eyebrow', rows: 1 },
  { group: 'requirements', key: 'title', label: 'Requirements — Heading', rows: 1 },
  { group: 'requirements', key: 'subtitle', label: 'Requirements — Subheading', rows: 2 },
];

const GROUP_LABELS: Record<Group, string> = {
  hero: 'Hero',
  about: 'About the pilgrimage',
  description: 'Description section',
  requirements: 'Requirements heading',
};

export default function HajjContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><HajjContentManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function HajjContentManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<HajjContent>(HAJJ_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Merged over the seeded defaults, so a blank translation falls back to English.
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.hajj)
      .then((data) => {
        if (data) setForm(mergeContent(HAJJ_DEFAULT, data));
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const setTri = useCallback((group: Group, key: string, l: Lang, value: string) => {
    setForm((prev) => {
      const section = prev[group] as Record<string, unknown>;
      const field = section[key] as Record<string, string>;
      return {
        ...prev,
        [group]: { ...section, [key]: { ...field, [l]: value } },
      };
    });
  }, []);

  const setPhoto = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, about: { ...prev.about, photoUrl: value } }));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Stores a file-server key; hajjPhotoSrc() resolves keys and URLs alike.
      const key = await uploadAreaImage(file, 'hajj');
      setPhoto(key);
      success('Photo uploaded. Remember to save.');
    } catch {
      error('Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [setPhoto, success, error]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.hajj, form);
      success('Hajj page content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const inputClass = `w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/40 focus:border-transparent ${fontClass}`;

  // Group the fields so the form reads like the page it edits.
  const groups = FIELDS.reduce<Record<string, FieldDef[]>>((acc, f) => {
    (acc[f.group] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-rmc-green/30 hover:text-rmc-green">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rmc-green-light">
            <Compass className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hajj Service</h1>
            <p className="text-xs text-gray-400">Update the Hajj page copy and photo</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Pointer to the sibling editor — the checklist is not edited here. */}
      <Link
        href={`/${locale}/admin/content/hajj-requirements`}
        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-rmc-green/30"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rmc-gold/15 text-rmc-gold">
          <ListChecks className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">Hajj Requirements</span>
          <span className="block text-xs text-gray-400">
            The checklist cards and their RWF fees are managed separately →
          </span>
        </span>
      </Link>

      {/* Photo (shared across languages) */}
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="border-b border-gray-50 pb-3 text-sm font-bold text-gray-700">
          About photo <span className="font-normal text-gray-400">— shared across all languages</span>
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hajjPhotoSrc(form.about.photoUrl)}
            alt=""
            className="h-28 w-40 shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
          />
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <ImageIcon className="h-3.5 w-3.5 text-rmc-green" /> Photo
            </label>
            <input
              type="text"
              value={form.about.photoUrl}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://… or an uploaded image key"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rmc-green/40"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload image
              </button>
              <p className="text-[11px] text-gray-400">Paste a link, or upload — either works.</p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
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

      {/* Tri-lingual copy */}
      {(Object.keys(groups) as Group[]).map((group) => (
        <div key={group} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="flex items-center gap-2 border-b border-gray-50 pb-3 text-sm font-bold text-gray-700">
            {group === 'about' && <Sparkles className="h-4 w-4 text-rmc-gold" />}
            {group === 'description' && <BookOpen className="h-4 w-4 text-rmc-green" />}
            {GROUP_LABELS[group]}
            <span className="font-normal text-gray-400">
              — {LANGS.find((l) => l.key === lang)?.label}
            </span>
          </h2>

          {groups[group].map(({ key, label, rows, rich, hint }) => {
            const value = (form[group] as Record<string, Record<Lang, string>>)[key][lang];
            return (
              <div key={`${group}.${key}`}>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</label>
                {rich ? (
                  // Remounted per language: the editor only seeds its content once.
                  <RichTextEditor
                    key={`${group}.${key}-${lang}`}
                    value={value}
                    onChange={(html) => setTri(group, key, lang, html)}
                    dir={dir}
                    fontClassName={fontClass}
                  />
                ) : rows === 1 ? (
                  <input dir={dir} type="text" value={value}
                    onChange={(e) => setTri(group, key, lang, e.target.value)}
                    className={inputClass} />
                ) : (
                  <textarea dir={dir} rows={rows} value={value}
                    onChange={(e) => setTri(group, key, lang, e.target.value)}
                    className={`${inputClass} resize-none`} />
                )}
                {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
              </div>
            );
          })}
        </div>
      ))}

      <p className="text-[11px] text-gray-400">
        Empty translations fall back to English on the public page.
      </p>
    </div>
  );
}

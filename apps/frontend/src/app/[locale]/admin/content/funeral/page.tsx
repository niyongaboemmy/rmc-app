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
  FUNERAL_DEFAULT, type FuneralContent,
} from '@/lib/content-api';
import {
  Moon, ArrowLeft, Save, HandHeart, Phone, ListChecks, Loader2,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

/** The tri-lingual groups; `hotline.phone`/`phoneHref` are plain strings, edited apart. */
type Group = keyof FuneralContent;

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
  { group: 'hero', key: 'title', label: 'Hero — Title', rows: 1 },
  { group: 'hero', key: 'subtitle', label: 'Hero — Standfirst', rows: 3 },
  {
    group: 'hero', key: 'ayahRef', label: 'Hero — Ayah reference', rows: 1,
    hint: 'The citation under the ayah. The ayah itself is scripture and is not editable.',
  },
  { group: 'quick', key: 'title', label: 'Quick actions — Heading', rows: 1 },
  { group: 'quick', key: 'subtitle', label: 'Quick actions — Subheading', rows: 3 },
  { group: 'quick', key: 'reportTitle', label: 'Card 1 — Title', rows: 1 },
  { group: 'quick', key: 'reportDesc', label: 'Card 1 — Description', rows: 2 },
  { group: 'quick', key: 'cemeteryTitle', label: 'Card 2 — Title', rows: 1 },
  { group: 'quick', key: 'cemeteryDesc', label: 'Card 2 — Description', rows: 2 },
  { group: 'description', key: 'eyebrow', label: 'Description — Eyebrow', rows: 1 },
  { group: 'description', key: 'title', label: 'Description — Heading', rows: 1 },
  {
    group: 'description', key: 'body', label: 'Description — Body', rows: 0, rich: true,
    hint: 'What RMC does for the family: the rites, the paperwork, the cost, how soon to call. Clearing the English body hides the section.',
  },
  { group: 'steps', key: 'eyebrow', label: 'Process timeline — Eyebrow', rows: 1 },
  { group: 'steps', key: 'title', label: 'Process timeline — Heading', rows: 1 },
  { group: 'steps', key: 'subtitle', label: 'Process timeline — Subheading', rows: 2 },
  { group: 'hotline', key: 'label', label: 'Call bar — Label', rows: 1 },
  { group: 'hotline', key: 'note', label: 'Call bar — Note under the label', rows: 1 },
  { group: 'cemeteries', key: 'title', label: 'Cemetery page — Heading', rows: 1 },
  { group: 'cemeteries', key: 'subtitle', label: 'Cemetery page — Subheading', rows: 2 },
  {
    group: 'cemeteries', key: 'emptyTitle', label: 'Cemetery page — No results heading', rows: 1,
    hint: 'Shown when a search matches no cemetery. The cemeteries themselves are managed under Admin → Funeral.',
  },
  { group: 'cemeteries', key: 'emptyText', label: 'Cemetery page — No results message', rows: 2 },
  { group: 'transports', key: 'title', label: 'Transport section — Heading', rows: 1 },
  {
    group: 'transports', key: 'subtitle', label: 'Transport section — Subheading', rows: 2,
    hint: 'The mosques listed under it are records, not copy.',
  },
  { group: 'cta', key: 'title', label: 'Closing band — Heading', rows: 1 },
  { group: 'cta', key: 'subtitle', label: 'Closing band — Message', rows: 3 },
  { group: 'cta', key: 'reportLabel', label: 'Closing band — Report button', rows: 1 },
  { group: 'cta', key: 'contactLabel', label: 'Closing band — Contact button', rows: 1 },
];

const GROUP_LABELS: Record<Group, string> = {
  hero: 'Page hero',
  quick: 'Quick actions',
  cemeteries: 'Cemetery directory page',
  transports: 'Transport section heading',
  cta: 'Closing band',
  description: 'What we do',
  steps: 'Process timeline heading',
  hotline: 'Sticky call bar',
};

export default function FuneralContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><FuneralContentManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function FuneralContentManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<FuneralContent>(FUNERAL_DEFAULT);
  const [saving, setSaving] = useState(false);

  // Merged over the seeded defaults, so a blank translation falls back to English.
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.funeral)
      .then((data) => {
        if (data) setForm(mergeContent(FUNERAL_DEFAULT, data));
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const setTri = useCallback((group: Group, key: string, l: Lang, value: string) => {
    setForm((prev) => {
      const section = prev[group] as Record<string, unknown>;
      const field = section[key] as Record<string, string>;
      return { ...prev, [group]: { ...section, [key]: { ...field, [l]: value } } };
    });
  }, []);

  const setHotline = useCallback((key: 'phone' | 'phoneHref', value: string) => {
    setForm((prev) => ({ ...prev, hotline: { ...prev.hotline, [key]: value } }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.funeral, form);
      success('Funeral page content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const inputClass = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${fontClass}`;

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
            <Moon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Funeral Service</h1>
            <p className="text-xs text-gray-400">Every heading, blurb and button on the public Funeral pages, plus the sticky call bar</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/20 transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Pointer to the sibling editor — the timeline's steps are not edited here. */}
      <Link
        href={`/${locale}/admin/content/funeral-request-steps`}
        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-rmc-green/30"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rmc-gold/15 text-rmc-gold">
          <ListChecks className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">Funeral Request Steps</span>
          <span className="block text-xs text-gray-400">
            The steps themselves — shown both in the public timeline and on a family&apos;s request tracker →
          </span>
        </span>
      </Link>

      {/* Phone number (shared across languages) */}
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="flex items-center gap-2 border-b border-gray-50 pb-3 text-sm font-bold text-gray-700">
          <Phone className="h-4 w-4 text-rmc-green" />
          Hotline number <span className="font-normal text-gray-400">— shared across all languages</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Number as displayed</label>
            <input
              type="text"
              value={form.hotline.phone}
              onChange={(e) => setHotline('phone', e.target.value)}
              placeholder="(+250) 788 308 436"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rmc-green"
            />
            <p className="mt-1 text-[11px] text-gray-400">Clearing this hides the call bar entirely.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Number as dialled</label>
            <input
              type="text"
              value={form.hotline.phoneHref}
              onChange={(e) => setHotline('phoneHref', e.target.value)}
              placeholder="tel:+250788308436"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rmc-green"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              What the phone actually dials, e.g. <span className="font-mono">tel:+250788308436</span>.
            </p>
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
            {group === 'description' && <HandHeart className="h-4 w-4 text-rmc-green" />}
            {group === 'hotline' && <Phone className="h-4 w-4 text-rmc-green" />}
            {GROUP_LABELS[group]}
            <span className="font-normal text-gray-400">
              — {LANGS.find((l) => l.key === lang)?.label}
            </span>
          </h2>

          {groups[group].map(({ key, label, rows, rich, hint }) => {
            const value = (form[group] as Record<string, Record<Lang, string>>)[key][lang];
            return (
              <div key={`${group}.${key}`}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
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

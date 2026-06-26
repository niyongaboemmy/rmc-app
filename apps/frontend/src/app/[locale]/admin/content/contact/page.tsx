'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys, getSiteContent, saveSiteContent, mergeContent,
  CONTACT_DEFAULT, type ContactContent,
} from '@/lib/content-api';
import {
  Mail, ArrowLeft, Save, MapPin, Phone, Clock, Share2, Globe,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

// Tri-lingual fields (edited per language tab). `rows > 1` renders a textarea.
type TriKey = Exclude<keyof ContactContent, 'phone' | 'phoneHref' | 'email' | 'email2'>;

const TRI_SECTIONS: { key: TriKey; label: string; rows: number; icon: React.ElementType | null }[] = [
  { key: 'title', label: 'Hero — Title', rows: 1, icon: Mail },
  { key: 'subtitle', label: 'Hero — Subtitle', rows: 2, icon: null },
  { key: 'communicationTitle', label: 'Get in Touch — Title', rows: 1, icon: Globe },
  { key: 'communicationSubtitle', label: 'Get in Touch — Subtitle', rows: 2, icon: null },
  { key: 'address', label: 'Address', rows: 2, icon: MapPin },
  { key: 'hours', label: 'Office Hours', rows: 1, icon: Clock },
  { key: 'socialTitle', label: 'Follow Us — Heading', rows: 1, icon: Share2 },
  { key: 'findMosqueTitle', label: 'Find a Mosque — Title', rows: 1, icon: MapPin },
  { key: 'findMosqueSubtitle', label: 'Find a Mosque — Subtitle', rows: 2, icon: null },
];

// Plain (non-translated) contact details.
const PLAIN_FIELDS: { key: 'phone' | 'phoneHref' | 'email' | 'email2'; label: string; hint?: string; icon: React.ElementType }[] = [
  { key: 'phone', label: 'Phone (displayed)', icon: Phone },
  { key: 'phoneHref', label: 'Phone link', hint: 'e.g. tel:+250788308436', icon: Phone },
  { key: 'email', label: 'Primary email', icon: Mail },
  { key: 'email2', label: 'Secondary email', icon: Mail },
];

export default function ContactContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><ContactContentManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function ContactContentManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<ContactContent>(CONTACT_DEFAULT);
  const [saving, setSaving] = useState(false);

  // Load saved content (merged over the seeded defaults so blank translations
  // fall back to English).
  useEffect(() => {
    getSiteContent<Record<string, unknown>>(ContentKeys.contact)
      .then((data) => {
        if (data) setForm(mergeContent(CONTACT_DEFAULT, data));
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const setTri = useCallback((key: TriKey, l: Lang, value: string) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], [l]: value } }));
  }, []);

  const setPlain = useCallback((key: 'phone' | 'phoneHref' | 'email' | 'email2', value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.contact, form);
      success('Contact page content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contact Page</h1>
            <p className="text-xs text-gray-400">Update the Contact page content</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-teal-600/20 transition-colors">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Plain contact details (shared across languages) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 pb-3 border-b border-gray-50">
          Contact Details <span className="font-normal text-gray-400">— shared across all languages</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLAIN_FIELDS.map(({ key, label, hint, icon: Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-teal-500" /> {label}
              </label>
              <input type="text" value={form[key]} onChange={(e) => setPlain(key, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
              {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Tri-lingual fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-700 pb-3 border-b border-gray-50">
          Content — {LANGS.find((l) => l.key === lang)?.label}
        </h2>
        {TRI_SECTIONS.map(({ key, label, rows, icon: Icon }) => (
          <div key={key}>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              {Icon && <Icon className="w-3.5 h-3.5 text-teal-500" />}
              {label}
            </label>
            {rows === 1 ? (
              <input dir={dir} type="text" value={form[key][lang]} onChange={(e) => setTri(key, lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent ${fontClass}`} />
            ) : (
              <textarea dir={dir} rows={rows} value={form[key][lang]} onChange={(e) => setTri(key, lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none ${fontClass}`} />
            )}
          </div>
        ))}
        <p className="text-[11px] text-gray-400">
          Empty translations fall back to English on the public page. The &ldquo;Follow Us&rdquo; channel
          buttons are managed in <span className="font-semibold">Content → Social Media</span>.
        </p>
      </div>
    </div>
  );
}

function LanguageTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {LANGS.map((l) => (
        <button key={l.key} onClick={() => onChange(l.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

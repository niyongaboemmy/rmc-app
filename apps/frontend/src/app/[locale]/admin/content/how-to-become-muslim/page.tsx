'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  HOW_TO_BECOME_MUSLIM_DEFAULT,
  getSiteContent,
  saveSiteContent,
  mergeContent,
  type HowToBecomeMuslimContent,
  type HowLink,
  type Tri,
} from '@/lib/content-api';
import {
  ArrowLeft, Save, HeartHandshake, Trash2, Plus,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

const ICON_OPTIONS = [
  'BookOpen', 'GraduationCap', 'Heart', 'MessageSquareQuote', 'Droplets',
  'Sparkles', 'MapPin', 'HeartHandshake', 'CheckCircle2',
];

export default function HowToBecomeMuslimAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <Manager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function Manager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<HowToBecomeMuslimContent>(HOW_TO_BECOME_MUSLIM_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, unknown>>(ContentKeys.howToBecomeMuslim)
      .then((data) => {
        if (active && data) setForm(mergeContent(HOW_TO_BECOME_MUSLIM_DEFAULT, data));
      })
      .catch(() => {/* keep defaults */})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // ── setters ──────────────────────────────────────────────────────────────
  const setTop = useCallback(<K extends keyof HowToBecomeMuslimContent>(field: K, value: HowToBecomeMuslimContent[K]) => {
    setForm((p) => ({ ...p, [field]: value }));
  }, []);

  const setTri = useCallback((field: keyof HowToBecomeMuslimContent, l: Lang, value: string) => {
    setForm((p) => ({ ...p, [field]: { ...(p[field] as Tri), [l]: value } }));
  }, []);

  const setLink = useCallback((idx: number, mutate: (l: HowLink) => HowLink) => {
    setForm((p) => ({ ...p, links: p.links.map((l, i) => (i === idx ? mutate(l) : l)) }));
  }, []);

  const addLink = () => setForm((p) => ({
    ...p,
    links: [...p.links, { icon: 'Sparkles', title: { en: '', rw: '', ar: '' }, description: { en: '', rw: '', ar: '' }, href: '' }],
  }));
  const removeLink = (idx: number) => setForm((p) => ({ ...p, links: p.links.filter((_, i) => i !== idx) }));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.howToBecomeMuslim, form);
      setForm((p) => ({ ...p, ...saved }));
      success('Content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">How to Become a Muslim</h1>
            <p className="text-xs text-gray-400">Header, the Shahada & steps</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {LANGS.map((l) => (
          <button key={l.key} onClick={() => setLang(l.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Header copy */}
      <Card title={`Header — ${LANGS.find((l) => l.key === lang)?.label}`}>
        <TriInput label="Eyebrow" field="eyebrow" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <div className="grid grid-cols-2 gap-3">
          <TriInput label="Title" field="title" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
          <TriInput label="Title accent (green)" field="titleAccent" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        </div>
        <TriInput label="Lede / intro paragraph" field="lede" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} textarea />
      </Card>

      {/* Shahada */}
      <Card title="The Shahada (words to read)">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Arabic text (shared)</label>
          <input value={form.shahadaArabic} onChange={(e) => setTop('shahadaArabic', e.target.value)} dir="rtl"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base font-arabic focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Transliteration (shared)</label>
          <input value={form.shahadaTransliteration} onChange={(e) => setTop('shahadaTransliteration', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <TriInput label={`Label — ${lang.toUpperCase()}`} field="shahadaLabel" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <TriInput label={`Translation — ${lang.toUpperCase()}`} field="shahadaTranslation" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} textarea />
      </Card>

      {/* Links */}
      <Card title={`Links — ${LANGS.find((l) => l.key === lang)?.label}`}>
        <TriInput label="Section heading" field="linksHeading" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <div className="space-y-4">
          {form.links.map((link, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500">Link {idx + 1}</span>
                <button onClick={() => removeLink(idx)} className="text-gray-400 hover:text-red-500" aria-label="Remove link">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Icon</label>
                  <select
                    value={link.icon}
                    onChange={(e) => setLink(idx, (l) => ({ ...l, icon: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <input
                    dir={dir}
                    value={link.title[lang]}
                    onChange={(e) => setLink(idx, (l) => ({ ...l, title: { ...l.title, [lang]: e.target.value } }))}
                    placeholder="Link title"
                    className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${fontClass}`}
                  />
                  <textarea
                    dir={dir}
                    rows={2}
                    value={link.description[lang]}
                    onChange={(e) => setLink(idx, (l) => ({ ...l, description: { ...l.description, [lang]: e.target.value } }))}
                    placeholder="Link description"
                    className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${fontClass}`}
                  />
                  <input
                    dir="ltr"
                    value={link.href}
                    onChange={(e) => setLink(idx, (l) => ({ ...l, href: e.target.value }))}
                    placeholder="Destination — https://… (new tab) or /schools (in-app)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLink} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          <Plus className="w-4 h-4" /> Add link
        </button>
      </Card>
    </div>
  );
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="text-sm font-bold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}

function TriInput({
  label, field, lang, form, setTri, dir, fontClass, textarea,
}: {
  label: string;
  field: keyof HowToBecomeMuslimContent;
  lang: Lang;
  form: HowToBecomeMuslimContent;
  setTri: (field: keyof HowToBecomeMuslimContent, l: Lang, value: string) => void;
  dir: 'ltr' | 'rtl';
  fontClass: string;
  textarea?: boolean;
}) {
  const value = (form[field] as Tri)[lang] ?? '';
  const cls = `w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${fontClass}`;
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea dir={dir} rows={3} value={value} onChange={(e) => setTri(field, lang, e.target.value)} className={`${cls} resize-none`} />
      ) : (
        <input dir={dir} value={value} onChange={(e) => setTri(field, lang, e.target.value)} className={cls} />
      )}
    </div>
  );
}

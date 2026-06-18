'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  HERO_DEFAULT,
  getSiteContent,
  saveSiteContent,
  type HeroContent,
  type Tri,
} from '@/lib/content-api';
import { Images, ArrowLeft, Save, Plus, Trash2, ImageIcon } from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const INITIAL = HERO_DEFAULT;

export default function HeroPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <HeroManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function HeroManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<HeroContent>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<HeroContent>(ContentKeys.hero)
      .then((data) => {
        if (active && data) setForm({ ...INITIAL, ...data });
      })
      .catch(() => {
        /* keep defaults — section simply hasn't been saved yet */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Set a plain string field (salam / hrefs).
  const setField = useCallback(<K extends 'salam' | 'primaryHref' | 'secondaryHref'>(field: K, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set one language slot of a Tri field.
  const setTri = useCallback(
    <K extends 'headline' | 'subtitle' | 'primaryCta' | 'secondaryCta'>(field: K, l: Lang, value: string) => {
      setForm((prev) => ({ ...prev, [field]: { ...prev[field], [l]: value } as Tri }));
    },
    [],
  );

  // ── Slides (image URL list) ──
  const setSlide = useCallback((index: number, value: string) => {
    setForm((prev) => ({ ...prev, slides: prev.slides.map((s, i) => (i === index ? value : s)) }));
  }, []);
  const addSlide = useCallback(() => {
    setForm((prev) => ({ ...prev, slides: [...prev.slides, ''] }));
  }, []);
  const removeSlide = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, slides: prev.slides.filter((_, i) => i !== index) }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.hero, form);
      setForm((prev) => ({ ...prev, ...saved }));
      success('Content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const langLabel = LANGS.find((l) => l.key === lang)?.label;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Images className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hero Section</h1>
            <p className="text-xs text-gray-400">Update the homepage hero banner, copy & background slideshow</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Greeting (salam) — not translated */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
        <label className="block text-xs font-semibold text-gray-700">Arabic Greeting (eyebrow)</label>
        <p className="text-[11px] text-gray-400 mb-1.5">Shown above the headline in all languages — not translated.</p>
        <input
          dir="rtl"
          type="text"
          value={form.salam}
          onChange={(e) => setField('salam', e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 font-arabic focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Translatable copy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700">Copy — {langLabel}</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Headline</label>
          <textarea
            dir={dir}
            rows={2}
            value={form.headline[lang]}
            onChange={(e) => setTri('headline', lang, e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
          <textarea
            dir={dir}
            rows={3}
            value={form.subtitle[lang]}
            onChange={(e) => setTri('subtitle', lang, e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>
      </div>

      {/* CTAs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700">Call-to-action Buttons — {langLabel}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Primary Button Label</label>
            <input
              dir={dir}
              type="text"
              value={form.primaryCta[lang]}
              onChange={(e) => setTri('primaryCta', lang, e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${fontClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Primary Button Link</label>
            <input
              dir="ltr"
              type="text"
              placeholder="/services"
              value={form.primaryHref}
              onChange={(e) => setField('primaryHref', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Secondary Button Label</label>
            <input
              dir={dir}
              type="text"
              value={form.secondaryCta[lang]}
              onChange={(e) => setTri('secondaryCta', lang, e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${fontClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Secondary Button Link</label>
            <input
              dir="ltr"
              type="text"
              placeholder="/activities"
              value={form.secondaryHref}
              onChange={(e) => setField('secondaryHref', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Links are relative to the active locale (e.g. <code className="px-1 py-0.5 rounded bg-gray-100">/services</code> → <code className="px-1 py-0.5 rounded bg-gray-100">/{locale}/services</code>).</p>
      </div>

      {/* Background slideshow */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Background Slideshow</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Image URLs that crossfade behind the hero copy.</p>
          </div>
          <button onClick={addSlide} type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Image
          </button>
        </div>

        {form.slides.length === 0 && (
          <div className="text-center py-10 text-gray-300">
            <ImageIcon className="w-9 h-9 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No background images yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {form.slides.map((src, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <input
                dir="ltr"
                type="text"
                placeholder="https://…/image.jpg"
                value={src}
                onChange={(e) => setSlide(index, e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button onClick={() => removeSlide(index)} type="button"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
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

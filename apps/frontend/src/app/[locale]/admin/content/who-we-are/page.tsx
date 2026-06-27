'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  WHO_WE_ARE_DEFAULT,
  getSiteContent,
  saveSiteContent,
  type WhoWeAreContent,
} from '@/lib/content-api';
import { Info, ArrowLeft, Save, Users, Building2, Map, Star } from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const INITIAL = WHO_WE_ARE_DEFAULT;

export default function WhoWeArePage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <WhoWeAreManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function WhoWeAreManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<WhoWeAreContent>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, string>>(ContentKeys.whoWeAre)
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

  const set = useCallback(<K extends keyof WhoWeAreContent>(field: K, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.whoWeAre, form);
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
  const sfx = lang === 'en' ? 'En' : lang === 'rw' ? 'Rw' : 'Ar';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Info className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Who We Are</h1>
            <p className="text-xs text-gray-400">Update homepage overview content</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-violet-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Community stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <BarIcon />
          Community Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Members', field: 'membersCount' as const, icon: Users, suffix: '+', color: 'text-emerald-600' },
            { label: 'Mosques', field: 'mosquesCount' as const, icon: Building2, suffix: '+', color: 'text-blue-600' },
            { label: 'Provinces', field: 'provincesCount' as const, icon: Map, suffix: '', color: 'text-violet-600' },
            { label: 'Years of Service', field: 'yearsOfService' as const, icon: Star, suffix: '+', color: 'text-amber-600' },
          ].map(({ label, field, icon: Icon, suffix, color }) => (
            <div key={field} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs font-medium text-gray-500">{label}</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => set(field, e.target.value)}
                  className={`w-full text-xl font-bold ${color} bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-lg p-1`}
                />
                <span className={`text-lg font-bold ${color}`}>{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Text content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700">Content — {LANGS.find((l) => l.key === lang)?.label}</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Overview Description</label>
          <textarea
            dir={dir}
            rows={4}
            value={lang === 'en' ? form.descriptionEn : lang === 'rw' ? form.descriptionRw : form.descriptionAr}
            onChange={(e) => set(lang === 'en' ? 'descriptionEn' : lang === 'rw' ? 'descriptionRw' : 'descriptionAr', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mission Statement</label>
          <textarea
            dir={dir}
            rows={2}
            value={lang === 'en' ? form.missionEn : lang === 'rw' ? form.missionRw : form.missionAr}
            onChange={(e) => set(lang === 'en' ? 'missionEn' : lang === 'rw' ? 'missionRw' : 'missionAr', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vision Statement</label>
          <textarea
            dir={dir}
            rows={2}
            value={lang === 'en' ? form.visionEn : lang === 'rw' ? form.visionRw : form.visionAr}
            onChange={(e) => set(lang === 'en' ? 'visionEn' : lang === 'rw' ? 'visionRw' : 'visionAr', e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none ${fontClass}`}
          />
        </div>

        {/* Headings & button labels */}
        {([
          { base: 'heading', label: 'Heading' },
          { base: 'headingHighlight', label: 'Heading Highlight (green text)' },
          { base: 'verse', label: 'Arabic Verse' },
          { base: 'verseRef', label: 'Verse Reference / Translation' },
        ] as const).map(({ base, label }) => {
          const key = `${base}${sfx}` as keyof WhoWeAreContent;
          return (
            <div key={base}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
              <input
                dir={dir}
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${fontClass}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarIcon() {
  return (
    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
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

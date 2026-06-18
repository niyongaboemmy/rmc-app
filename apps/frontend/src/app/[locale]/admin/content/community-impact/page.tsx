'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  STATS_DEFAULT,
  getSiteContent,
  saveSiteContent,
  pick,
  type StatsContent,
  type StatItem,
  type Tri,
} from '@/lib/content-api';
import { BarChart3, ArrowLeft, Save, Plus, Trash2, TrendingUp } from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

/** lucide icon names selectable for each stat item. */
const ICON_OPTIONS = ['Users', 'GraduationCap', 'Building2', 'Map', 'LayoutGrid'];

const INITIAL: StatsContent = STATS_DEFAULT;

export default function CommunityImpactPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><CommunityImpactManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function CommunityImpactManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<StatsContent>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<Partial<StatsContent>>(ContentKeys.stats)
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

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';

  // ─── Header text setters (Tri fields) ─────────────────────────────────────
  const setTri = useCallback(
    (field: 'eyebrow' | 'title' | 'titleAccent' | 'subtitle', value: string) => {
      setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
    },
    [lang],
  );

  // ─── Item setters ─────────────────────────────────────────────────────────
  const setItem = useCallback(
    (index: number, patch: Partial<StatItem>) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
      }));
    },
    [],
  );

  const setItemLabel = useCallback(
    (index: number, value: string) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((it, i) =>
          i === index ? { ...it, label: { ...it.label, [lang]: value } } : it,
        ),
      }));
    },
    [lang],
  );

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { value: 0, suffix: '+', icon: 'Users', label: { en: '', rw: '', ar: '' } as Tri },
      ],
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.stats, form);
      setForm((prev) => ({ ...prev, ...saved }));
      success('Community impact stats saved successfully.');
    } catch {
      error('Could not save community impact stats. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, success, error]);

  const triValue = (t: Tri) => t[lang] ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Impact</h1>
            <p className="text-xs text-gray-400">Update homepage statistics</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Stats preview (dark section like homepage) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rmc-green-deep to-rmc-green p-6">
        <div className="absolute inset-0 pattern-islamic opacity-20 pointer-events-none" />
        <div className="relative">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Preview — how it looks on homepage
          </p>
          <p className="text-rmc-gold text-xs font-medium mt-2">{pick(form.eyebrow, lang)}</p>
          <p className="text-white text-lg font-bold">
            {pick(form.title, lang)} <span className="text-rmc-gold">{pick(form.titleAccent, lang)}</span>
          </p>
          <p className="text-white/50 text-xs">{pick(form.subtitle, lang)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {form.items.map((item, i) => (
              <div key={i} className="bg-white/10 border border-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white tabular-nums">
                  {Number(item.value).toLocaleString()}{item.suffix}
                </p>
                <p className="text-white/50 text-xs mt-1">{pick(item.label, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Header text — per-language */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700">Section Header — {LANGS.find((l) => l.key === lang)?.label}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Eyebrow</label>
            <input
              dir={dir}
              value={triValue(form.eyebrow)}
              onChange={(e) => setTri('eyebrow', e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${fontClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
            <input
              dir={dir}
              value={triValue(form.subtitle)}
              onChange={(e) => setTri('subtitle', e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${fontClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
            <input
              dir={dir}
              value={triValue(form.title)}
              onChange={(e) => setTri('title', e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${fontClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title Accent</label>
            <input
              dir={dir}
              value={triValue(form.titleAccent)}
              onChange={(e) => setTri('titleAccent', e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${fontClass}`}
            />
          </div>
        </div>
      </div>

      {/* Stat items list editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Statistics</h2>
          <button onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Stat
          </button>
        </div>

        {form.items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Value</label>
                <input
                  type="number"
                  min="0"
                  value={item.value}
                  onChange={(e) => setItem(i, { value: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div className="w-20">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Suffix</label>
                <input
                  value={item.suffix}
                  onChange={(e) => setItem(i, { suffix: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div className="w-40">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Icon</label>
                <select
                  value={item.icon}
                  onChange={(e) => setItem(i, { icon: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                >
                  {ICON_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[12rem]">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Label — {LANGS.find((l) => l.key === lang)?.label}
                </label>
                <input
                  dir={dir}
                  value={triValue(item.label)}
                  onChange={(e) => setItemLabel(i, e.target.value)}
                  className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${fontClass}`}
                />
              </div>
              <button onClick={() => removeItem(i)}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
        <BarChart3 className="w-4 h-4 shrink-0 mt-0.5" />
        <p>These statistics are displayed with an animated count-up effect on the homepage. Values are shown with the configured suffix (e.g. <strong>+</strong>) where applicable.</p>
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

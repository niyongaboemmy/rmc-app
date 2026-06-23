'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  type HowStep,
  type Tri,
} from '@/lib/content-api';
import { uploadMedia, resolveMediaUrl } from '@/lib/mediaUpload';
import {
  ArrowLeft, Save, HeartHandshake, Upload, Trash2, Plus, Video, Info,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

const STEP_ICON_OPTIONS = [
  'Heart', 'MessageSquareQuote', 'Droplets', 'Sparkles', 'MapPin', 'HeartHandshake', 'CheckCircle2',
];

const VIDEO_FIELD: Record<Lang, 'videoEn' | 'videoRw' | 'videoAr'> = {
  en: 'videoEn',
  rw: 'videoRw',
  ar: 'videoAr',
};

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

  const setStep = useCallback((idx: number, mutate: (s: HowStep) => HowStep) => {
    setForm((p) => ({ ...p, steps: p.steps.map((s, i) => (i === idx ? mutate(s) : s)) }));
  }, []);

  const addStep = () => setForm((p) => ({
    ...p,
    steps: [...p.steps, { icon: 'Sparkles', title: { en: '', rw: '', ar: '' }, description: { en: '', rw: '', ar: '' } }],
  }));
  const removeStep = (idx: number) => setForm((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));

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
            <p className="text-xs text-gray-400">Intro video (per language), the Shahada & steps</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition-colors">
          {saving || loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Save Changes'}
        </button>
      </div>

      {/* Per-language video */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
          <Video className="w-4 h-4 text-emerald-600" /> Intro Video — by language
        </h2>
        <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Plays muted &amp; auto-loops. Each language can have its own clip; empty languages fall back to English.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LANGS.map((l) => (
            <VideoField
              key={l.key}
              label={l.label}
              value={form[VIDEO_FIELD[l.key]]}
              onChange={(v) => setTop(VIDEO_FIELD[l.key], v)}
            />
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Poster image (shown before play) — URL or key</label>
          <input
            value={form.videoPoster}
            onChange={(e) => setTop('videoPoster', e.target.value)}
            placeholder="/logo.webp or https://…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
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

      {/* Steps */}
      <Card title={`Steps — ${LANGS.find((l) => l.key === lang)?.label}`}>
        <TriInput label="Steps heading" field="stepsHeading" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <div className="space-y-4">
          {form.steps.map((step, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500">Step {idx + 1}</span>
                <button onClick={() => removeStep(idx)} className="text-gray-400 hover:text-red-500" aria-label="Remove step">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Icon</label>
                  <select
                    value={step.icon}
                    onChange={(e) => setStep(idx, (s) => ({ ...s, icon: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {STEP_ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <input
                    dir={dir}
                    value={step.title[lang]}
                    onChange={(e) => setStep(idx, (s) => ({ ...s, title: { ...s.title, [lang]: e.target.value } }))}
                    placeholder="Step title"
                    className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${fontClass}`}
                  />
                  <textarea
                    dir={dir}
                    rows={2}
                    value={step.description[lang]}
                    onChange={(e) => setStep(idx, (s) => ({ ...s, description: { ...s.description, [lang]: e.target.value } }))}
                    placeholder="Step description"
                    className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${fontClass}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addStep} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          <Plus className="w-4 h-4" /> Add step
        </button>
      </Card>

      {/* Completion + What's Next */}
      <Card title={`After the steps — completion & "What's Next" — ${LANGS.find((l) => l.key === lang)?.label}`}>
        <TriInput label="Completion prompt (e.g. 'Have you taken your Shahada?')" field="completionPrompt" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <TriInput label="Welcome subtext (after they confirm)" field="completionSubtext" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} textarea />
        <div className="grid grid-cols-2 gap-3">
          <TriInput label="What's Next button label" field="whatNextCta" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">What&apos;s Next link (path, shared)</label>
            <input value={form.whatNextHref} onChange={(e) => setTop('whatNextHref', e.target.value)} placeholder="/new-muslim"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </Card>

      {/* Nearest school block */}
      <Card title={`Find the nearest school (map block) — ${LANGS.find((l) => l.key === lang)?.label}`}>
        <TriInput label="Heading" field="schoolHeading" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} />
        <TriInput label="Description" field="schoolDescription" lang={lang} form={form} setTri={setTri} dir={dir} fontClass={fontClass} textarea />
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

function VideoField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const src = resolveMediaUrl(value);

  const onFile = async (file: File) => {
    setErr(null);
    setUploading(true);
    setPct(0);
    try {
      const key = await uploadMedia(file, 'content', setPct);
      onChange(key);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600">{label}</span>
        {value && (
          <button onClick={() => onChange('')} className="text-gray-400 hover:text-red-500" aria-label="Clear video">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="aspect-video rounded-lg bg-gray-100 overflow-hidden mb-2 flex items-center justify-center">
        {src ? (
          <video src={src} className="w-full h-full object-cover" muted loop playsInline controls />
        ) : (
          <Video className="w-7 h-7 text-gray-300" />
        )}
      </div>

      <input ref={inputRef} type="file" accept="video/mp4,video/webm" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-60 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? `Uploading… ${pct}%` : value ? 'Replace video' : 'Upload video'}
      </button>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste a video URL"
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
    </div>
  );
}

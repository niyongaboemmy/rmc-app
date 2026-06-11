'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Building2, ArrowLeft, Save, Target, Eye, BookOpen, CheckCircle } from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

interface AboutContent {
  titleEn: string; titleRw: string; titleAr: string;
  subtitleEn: string; subtitleRw: string; subtitleAr: string;
  historyEn: string; historyRw: string; historyAr: string;
  missionEn: string; missionRw: string; missionAr: string;
  visionEn: string; visionRw: string; visionAr: string;
  valuesEn: string; valuesRw: string; valuesAr: string;
}

const INITIAL: AboutContent = {
  titleEn: 'About RMC', titleRw: 'Ibyerekeye RMC', titleAr: 'حول RMC',
  subtitleEn: 'Rwanda Muslim Community — Building a United Ummah',
  subtitleRw: 'Umuryango w\'Abasilamu bo mu Rwanda — Kubaka Ummah Umwe',
  subtitleAr: 'مجتمع المسلمين في رواندا — بناء أمة متحدة',
  historyEn: 'The Rwanda Muslim Community has been serving Muslims across Rwanda since its founding. With a network spanning all provinces and districts, RMC coordinates religious, educational, and social services for over 500,000 Muslims nationwide.',
  historyRw: 'Umuryango w\'Abasilamu bo mu Rwanda ukorera Abasilamu bose muri Rwanda kuva yarishingwa. Ufite intera yagutse muri leta zose n\'uturere, RMC ihuza serivisi z\'amadini, z\'uburezi n\'imibereho myiza y\'Abasilamu basaga 500,000 mu Rwanda.',
  historyAr: 'يخدم مجتمع المسلمين في رواندا المسلمين في جميع أنحاء رواندا منذ تأسيسه. مع شبكة تمتد عبر جميع المقاطعات والمقاطعات الفرعية، ينسق RMC الخدمات الدينية والتعليمية والاجتماعية لأكثر من 500,000 مسلم على المستوى الوطني.',
  missionEn: 'To unite and serve the Muslim community in Rwanda through digital innovation, promoting Islamic values, education, and social welfare.',
  missionRw: 'Guhuza no gukorera umuryango w\'Abasilamu mu Rwanda binyuze mu buhanga bwa digital, guteza imbere indangagaciro z\'Ubusilamu, uburezi n\'imibereho myiza.',
  missionAr: 'توحيد وخدمة المجتمع المسلم في رواندا من خلال الابتكار الرقمي، وتعزيز القيم الإسلامية والتعليم والرعاية الاجتماعية.',
  visionEn: 'A digitally empowered, unified, and prosperous Muslim community contributing to the development of Rwanda.',
  visionRw: 'Umuryango w\'Abasilamu uhuye, ukoresheje ikoranabuhanga kandi ugira inyungu, utera inkunga iterambere rya Rwanda.',
  visionAr: 'مجتمع مسلم ممكّن رقمياً، موحد ومزدهر، يساهم في تطوير رواندا.',
  valuesEn: 'Unity — Bringing Muslims together across all regions of Rwanda\nEducation — Promoting Islamic and secular education for all members\nService — Providing essential services to community members in need\nTransparency — Open and accountable governance of community resources',
  valuesRw: 'Ubumwe — Guhuza Abasilamu muri leta zose z\'u Rwanda\nUburezi — Guteza imbere uburezi bw\'Ubusilamu n\'ubw\'isi mu nyamuryango zose\nSerivisi — Gutanga serivisi ngombwa ku nyamuryango zikeneye\nIngeri — Ubuyobozi bugarukira kandi bumara inshingano',
  valuesAr: 'الوحدة — جمع المسلمين في جميع مناطق رواندا\nالتعليم — تعزيز التعليم الإسلامي والعلماني لجميع الأعضاء\nالخدمة — تقديم الخدمات الأساسية للأعضاء المحتاجين\nالشفافية — حوكمة مفتوحة ومسؤولة للموارد المجتمعية',
};

const CONTENT_SECTIONS = [
  { key: 'title', label: 'Page Title', rows: 1, icon: Building2 },
  { key: 'subtitle', label: 'Subtitle / Tagline', rows: 1, icon: null },
  { key: 'history', label: 'History & Overview', rows: 4, icon: BookOpen },
  { key: 'mission', label: 'Mission Statement', rows: 2, icon: Target },
  { key: 'vision', label: 'Vision Statement', rows: 2, icon: Eye },
  { key: 'values', label: 'Values (one per line: Name — Description)', rows: 5, icon: CheckCircle },
] as const;

export default function AboutRMCPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><AboutRMCManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function AboutRMCManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<AboutContent>(INITIAL);
  const [saving, setSaving] = useState(false);

  const getField = useCallback((key: string, l: Lang): string => {
    const f = form as unknown as Record<string, string>;
    const suffix = l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar';
    return f[`${key}${suffix}`] || '';
  }, [form]);

  const setField = useCallback((key: string, l: Lang, value: string) => {
    const suffix = l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar';
    setForm((prev) => ({ ...prev, [`${key}${suffix}`]: value } as AboutContent));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    success('About RMC content saved successfully.');
  }, [success]);

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
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">About RMC</h1>
            <p className="text-xs text-gray-400">Update the About page content</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-slate-700/20 transition-colors">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Content fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-700 pb-3 border-b border-gray-50">
          Content — {LANGS.find((l) => l.key === lang)?.label}
        </h2>

        {CONTENT_SECTIONS.map(({ key, label, rows, icon: Icon }) => (
          <div key={key}>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
              {label}
            </label>
            {rows === 1 ? (
              <input
                dir={dir}
                type="text"
                value={getField(key, lang)}
                onChange={(e) => setField(key, lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent ${fontClass}`}
              />
            ) : (
              <textarea
                dir={dir}
                rows={rows}
                value={getField(key, lang)}
                onChange={(e) => setField(key, lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none ${fontClass}`}
              />
            )}
          </div>
        ))}
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

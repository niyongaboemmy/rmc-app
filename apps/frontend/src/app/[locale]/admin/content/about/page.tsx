'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalDescription, ConfirmModal,
} from '@/components/ui/Modal';
import { apiClient } from '@/lib/api';
import { ContentKeys, getSiteContent, saveSiteContent } from '@/lib/content-api';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Building2, ArrowLeft, Save, Target, Eye, BookOpen,
  Clock, Plus, Edit2, Trash2, RefreshCw, Image,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface AboutContent {
  titleEn: string; titleRw: string; titleAr: string;
  subtitleEn: string; subtitleRw: string; subtitleAr: string;
  historyEn: string; historyRw: string; historyAr: string;
  missionEn: string; missionRw: string; missionAr: string;
  visionEn: string; visionRw: string; visionAr: string;
  // Section headings / subtitles + the Arabic verse (see CONTENT_SECTIONS below).
  [key: string]: string;
}

interface HistoryEntry {
  id: string;
  year: number;
  titleEn: string; titleRw: string; titleAr: string;
  descriptionEn: string; descriptionRw: string; descriptionAr: string;
  imageKey: string | null;
  sortOrder: number;
}

type HistoryEntryForm = Omit<HistoryEntry, 'id'>;

const INITIAL: AboutContent = {
  titleEn: 'About RMC', titleRw: 'Ibyerekeye RMC', titleAr: 'حول RMC',
  subtitleEn: 'Rwanda Muslim Community — Building a United Ummah',
  subtitleRw: "Umuryango w'Abasilamu bo mu Rwanda — Kubaka Ummah Umwe",
  subtitleAr: 'مجتمع المسلمين في رواندا — بناء أمة متحدة',
  historyEn: 'The Rwanda Muslim Community has been serving Muslims across Rwanda since its founding.',
  historyRw: "Umuryango w'Abasilamu bo mu Rwanda ukorera Abasilamu bose muri Rwanda kuva yarishingwa.",
  historyAr: 'يخدم مجتمع المسلمين في رواندا المسلمين في جميع أنحاء رواندا منذ تأسيسه.',
  missionEn: 'To unite and serve the Muslim community in Rwanda through digital innovation.',
  missionRw: "Guhuza no gukorera umuryango w'Abasilamu mu Rwanda binyuze mu buhanga bwa digital.",
  missionAr: 'توحيد وخدمة المجتمع المسلم في رواندا من خلال الابتكار الرقمي.',
  visionEn: 'A digitally empowered, unified, and prosperous Muslim community.',
  visionRw: "Umuryango w'Abasilamu uhuye, ukoresheje ikoranabuhanga kandi ugira inyungu.",
  visionAr: 'مجتمع مسلم ممكّن رقمياً، موحد ومزدهر.',

  // Section headings & subtitles (EN seeded; RW/AR fall back to EN until filled).
  whoWeAreHeadingEn: 'One Ummah,', whoWeAreHeadingRw: '', whoWeAreHeadingAr: '',
  whoWeAreHighlightEn: 'United Across Rwanda', whoWeAreHighlightRw: '', whoWeAreHighlightAr: '',
  // The Arabic verse is the same script in every locale — seeded in the EN slot
  // so it always renders; edit it under the Arabic tab if needed.
  verseEn: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا', verseRw: '', verseAr: '',
  verseRefEn: '“Hold firmly to the rope of Allah, all together” — Aal-Imran 3:103', verseRefRw: '', verseRefAr: '',
  missionTitleEn: 'Our Mission', missionTitleRw: '', missionTitleAr: '',
  visionTitleEn: 'Our Vision', visionTitleRw: '', visionTitleAr: '',
  leadershipTitleEn: 'Leadership', leadershipTitleRw: '', leadershipTitleAr: '',
  leadershipSubtitleEn: 'Guided by dedicated leaders committed to serving the community', leadershipSubtitleRw: '', leadershipSubtitleAr: '',
  galleryTitleEn: 'From Our Community', galleryTitleRw: '', galleryTitleAr: '',
  gallerySubtitleEn: 'Moments from gatherings, programs, and events across Rwanda', gallerySubtitleRw: '', gallerySubtitleAr: '',
};

interface Leader {
  id: string;
  image: string;
  nameEn: string; nameRw: string; nameAr: string;
  roleEn: string; roleRw: string; roleAr: string;
  email?: string;
  phone?: string;
}

// Seeded from the current About page leaders (photos + EN names/roles). Names are
// the same across languages; RW/AR roles fall back to EN until an admin fills them.
const LEADERS_DEFAULT: Leader[] = [
  { id: 'm1', image: 'https://i.postimg.cc/8CKkfkMS/Mufti.jpg',   nameEn: 'Sheikh SINDAYIGAYA Musa',     nameRw: 'Sheikh SINDAYIGAYA Musa',     nameAr: 'Sheikh SINDAYIGAYA Musa',     roleEn: 'Mufti of Rwanda',                 roleRw: '', roleAr: '' },
  { id: 'm2', image: 'https://i.postimg.cc/mkTL1ckm/V1A8567.jpg', nameEn: 'Sheikh MUSHUMBA Yunnus',      nameRw: 'Sheikh MUSHUMBA Yunnus',      nameAr: 'Sheikh MUSHUMBA Yunnus',      roleEn: 'Deputy Mufti of Rwanda',          roleRw: '', roleAr: '' },
  { id: 'm3', image: 'https://i.postimg.cc/9f1JHK96/Qadh.jpg',    nameEn: 'Sheikh SEGISEKURE Ibrahim',   nameRw: 'Sheikh SEGISEKURE Ibrahim',   nameAr: 'Sheikh SEGISEKURE Ibrahim',   roleEn: 'Qadhwi of Rwanda',                roleRw: '', roleAr: '' },
  { id: 'm4', image: 'https://i.postimg.cc/Cx0M5wJm/P1180223.jpg', nameEn: 'Sheikh NZANAHAYO Qassim',    nameRw: 'Sheikh NZANAHAYO Qassim',     nameAr: 'Sheikh NZANAHAYO Qassim',     roleEn: 'President of The Majlisi Shuyukh', roleRw: '', roleAr: '' },
  { id: 'm5', image: 'https://i.postimg.cc/Fsym22m4/P1180220.jpg', nameEn: 'Sheikh MBARUSHIMANA Suleiman', nameRw: 'Sheikh MBARUSHIMANA Suleiman', nameAr: 'Sheikh MBARUSHIMANA Suleiman', roleEn: 'Advisor to the Mufti of Rwanda',  roleRw: '', roleAr: '' },
  { id: 'm6', image: 'https://i.postimg.cc/YSxyqhck/ES-Salim.jpg', nameEn: 'Mr. SIBOMANA Salim',         nameRw: 'Mr. SIBOMANA Salim',          nameAr: 'Mr. SIBOMANA Salim',          roleEn: 'Executive Secretary',             roleRw: '', roleAr: '' },
];

const EMPTY_ENTRY: HistoryEntryForm = {
  year: new Date().getFullYear(),
  titleEn: '', titleRw: '', titleAr: '',
  descriptionEn: '', descriptionRw: '', descriptionAr: '',
  imageKey: null,
  sortOrder: 0,
};

const CONTENT_SECTIONS = [
  { key: 'title',    label: 'Page Title',        rows: 1, icon: Building2 },
  { key: 'subtitle', label: 'Hero Subtitle / Tagline', rows: 1, icon: null },
  { key: 'whoWeAreHeading',   label: 'Who We Are — Heading', rows: 1, icon: null },
  { key: 'whoWeAreHighlight', label: 'Who We Are — Heading Highlight', rows: 1, icon: null },
  { key: 'verse',    label: 'Arabic Verse', rows: 1, icon: null },
  { key: 'verseRef', label: 'Verse Reference / Translation', rows: 1, icon: null },
  { key: 'history',  label: 'History & Overview', rows: 4, icon: BookOpen },
  { key: 'missionTitle', label: 'Mission — Title', rows: 1, icon: Target },
  { key: 'mission',  label: 'Mission Statement',  rows: 2, icon: Target },
  { key: 'visionTitle', label: 'Vision — Title', rows: 1, icon: Eye },
  { key: 'vision',   label: 'Vision Statement',   rows: 2, icon: Eye },
  { key: 'leadershipTitle',    label: 'Leadership — Title', rows: 1, icon: Building2 },
  { key: 'leadershipSubtitle', label: 'Leadership — Subtitle', rows: 1, icon: null },
  { key: 'galleryTitle',    label: 'Gallery — Title', rows: 1, icon: Image },
  { key: 'gallerySubtitle', label: 'Gallery — Subtitle', rows: 1, icon: null },
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
  const { success, error } = useToast();
  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<AboutContent>(INITIAL);
  const [leaders, setLeaders] = useState<Leader[]>(LEADERS_DEFAULT);
  const [saving, setSaving] = useState(false);

  // History entries state
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entryModal, setEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [entryForm, setEntryForm] = useState<HistoryEntryForm>(EMPTY_ENTRY);
  const [entryLang, setEntryLang] = useState<Lang>('en');
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<HistoryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch(`${API_BASE}/content/history/entries`);
      const json = await res.json();
      setEntries(json.data ?? []);
    } catch {
      /* keep empty */
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Load saved About content (falls back to the seeded defaults above).
  useEffect(() => {
    getSiteContent<Partial<AboutContent> & { leaders?: Leader[] }>(ContentKeys.about)
      .then((data) => {
        if (!data) return;
        const { leaders: savedLeaders, ...text } = data;
        setForm((prev) => ({ ...prev, ...text } as AboutContent));
        if (Array.isArray(savedLeaders) && savedLeaders.length) setLeaders(savedLeaders);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const getField = useCallback((key: string, l: Lang): string => {
    const f = form as unknown as Record<string, string>;
    const suffix = l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar';
    return f[`${key}${suffix}`] || '';
  }, [form]);

  const setField = useCallback((key: string, l: Lang, value: string) => {
    const suffix = l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar';
    setForm((prev) => ({ ...prev, [`${key}${suffix}`]: value } as AboutContent));
  }, []);

  const setLeaderField = useCallback((id: string, key: keyof Leader, value: string) => {
    setLeaders((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }, []);
  const addLeader = useCallback(() => {
    setLeaders((prev) => [...prev, {
      id: crypto.randomUUID(), image: '',
      nameEn: '', nameRw: '', nameAr: '', roleEn: '', roleRw: '', roleAr: '',
      email: '', phone: '',
    }]);
  }, []);
  const removeLeader = useCallback((id: string) => {
    setLeaders((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.about, { ...form, leaders });
      success('About RMC content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, leaders, success, error]);

  // ── Entry CRUD ──────────────────────────────────────────────────────────────

  const openCreateEntry = () => {
    setEditingEntry(null);
    setEntryForm({ ...EMPTY_ENTRY, sortOrder: entries.length });
    setEntryLang('en');
    setEntryModal(true);
  };

  const openEditEntry = (e: HistoryEntry) => {
    setEditingEntry(e);
    setEntryForm({
      year: e.year, sortOrder: e.sortOrder, imageKey: e.imageKey,
      titleEn: e.titleEn, titleRw: e.titleRw, titleAr: e.titleAr,
      descriptionEn: e.descriptionEn, descriptionRw: e.descriptionRw, descriptionAr: e.descriptionAr,
    });
    setEntryLang('en');
    setEntryModal(true);
  };

  const handleSaveEntry = useCallback(async () => {
    if (!entryForm.titleEn.trim() || !entryForm.descriptionEn.trim()) {
      error('English title and description are required.'); return;
    }
    if (!entryForm.year || entryForm.year < 1900 || entryForm.year > 2100) {
      error('Enter a valid year (1900–2100).'); return;
    }
    setSavingEntry(true);
    try {
      if (editingEntry) {
        const res = await apiClient.put(`/content/history/entries/${editingEntry.id}`, entryForm);
        setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? res.data.data : e));
        success('Entry updated.');
      } else {
        const res = await apiClient.post('/content/history/entries', entryForm);
        setEntries((prev) => [...prev, res.data.data].sort((a, b) => a.year - b.year));
        success('Entry added.');
      }
      setEntryModal(false);
    } catch {
      error('Could not save entry. Please try again.');
    } finally {
      setSavingEntry(false);
    }
  }, [entryForm, editingEntry, error, success]);

  const handleDeleteEntry = useCallback(async () => {
    if (!deleteEntry) return;
    setDeletingEntry(true);
    try {
      await apiClient.delete(`/content/history/entries/${deleteEntry.id}`);
      setEntries((prev) => prev.filter((e) => e.id !== deleteEntry.id));
      success('Entry deleted.');
      setDeleteEntry(null);
    } catch {
      error('Could not delete entry.');
    } finally {
      setDeletingEntry(false);
    }
  }, [deleteEntry, error, success]);

  const setEF = <K extends keyof HistoryEntryForm>(k: K, v: HistoryEntryForm[K]) =>
    setEntryForm((p) => ({ ...p, [k]: v }));

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
        {CONTENT_SECTIONS.map(({ key, label, rows, icon: Icon }) => {
          // History/Overview, Mission and Vision use a rich-text editor (HTML).
          const isRich = key === 'history' || key === 'mission' || key === 'vision';
          return (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
                {label}
              </label>
              {isRich ? (
                // Remount per language so the editor seeds the right content.
                <RichTextEditor
                  key={`${key}-${lang}`}
                  value={getField(key, lang)}
                  onChange={(html) => setField(key, lang, html)}
                  dir={dir}
                  fontClassName={fontClass}
                />
              ) : rows === 1 ? (
                <input dir={dir} type="text" value={getField(key, lang)} onChange={(e) => setField(key, lang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent ${fontClass}`} />
              ) : (
                <textarea dir={dir} rows={rows} value={getField(key, lang)} onChange={(e) => setField(key, lang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none ${fontClass}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Leadership CRUD ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-gray-700">Leadership</h2>
            <span className="text-xs text-gray-400 font-normal">({leaders.length}) · editing {LANGS.find((l) => l.key === lang)?.label}</span>
          </div>
          <button onClick={addLeader}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Leader
          </button>
        </div>

        {leaders.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No leaders yet. Add the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((l) => {
              const suffix = lang === 'en' ? 'En' : lang === 'rw' ? 'Rw' : 'Ar';
              const nameKey = `name${suffix}` as keyof Leader;
              const roleKey = `role${suffix}` as keyof Leader;
              return (
                <div key={l.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-start gap-4">
                    {/* Compact square photo so it fits neatly beside the fields */}
                    <div className="w-24 sm:w-28 shrink-0">
                      <ImageUploadField value={l.image} onChange={(url) => setLeaderField(l.id, 'image', url)} heightClass="h-24 sm:h-28" compact />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 truncate">{l.nameEn || 'New leader'}</span>
                        <button onClick={() => removeLeader(l.id)} aria-label="Remove leader"
                          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name ({lang.toUpperCase()})</label>
                        <input dir={lang === 'ar' ? 'rtl' : 'ltr'} type="text" value={l[nameKey]}
                          onChange={(e) => setLeaderField(l.id, nameKey, e.target.value)}
                          className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent ${lang === 'ar' ? 'font-arabic' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role ({lang.toUpperCase()})</label>
                        <input dir={lang === 'ar' ? 'rtl' : 'ltr'} type="text" value={l[roleKey]}
                          onChange={(e) => setLeaderField(l.id, roleKey, e.target.value)}
                          className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent ${lang === 'ar' ? 'font-arabic' : ''}`} />
                      </div>
                      {/* Email + phone — shared across languages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                          <input type="email" value={l.email ?? ''}
                            onChange={(e) => setLeaderField(l.id, 'email', e.target.value)}
                            placeholder="name@rmc.org.rw"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                          <input type="tel" value={l.phone ?? ''}
                            onChange={(e) => setLeaderField(l.id, 'phone', e.target.value)}
                            placeholder="+250 7XX XXX XXX"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-gray-400">Photos and names are shared across languages; switch the language tab above to edit RW/AR names &amp; roles. Remember to click <span className="font-semibold">Save Changes</span>.</p>
      </div>

      {/* ── History Entries CRUD ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-gray-700">History Timeline Entries</h2>
            <span className="text-xs text-gray-400 font-normal">({entries.length} entries)</span>
          </div>
          <button onClick={openCreateEntry} disabled={loadingEntries}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
        </div>

        {loadingEntries ? (
          <div className="flex items-center gap-2 py-6 justify-center text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No history entries yet. Add the first one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-slate-200 transition-colors bg-gray-50/50">
                <div className="w-14 h-14 rounded-xl bg-rmc-gold/10 border border-rmc-gold/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-rmc-gold">{e.year}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{e.titleEn || '—'}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{e.descriptionEn}</p>
                  {e.imageKey && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Image className="w-3 h-3" /> {e.imageKey}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditEntry(e)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteEntry(e)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry modal */}
      <Modal isOpen={entryModal} onClose={() => setEntryModal(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingEntry ? 'Edit History Entry' : 'Add History Entry'}</ModalTitle>
          <ModalDescription>Fill in the event details in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Year + Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Year <span className="text-red-500">*</span></label>
              <input type="number" min={1900} max={2100} value={entryForm.year}
                onChange={(e) => setEF('year', parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sort Order <span className="ml-1 font-normal text-gray-400">(lower = earlier)</span>
              </label>
              <input type="number" min={0} value={entryForm.sortOrder}
                onChange={(e) => setEF('sortOrder', parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent" />
            </div>
          </div>

          {/* Image key */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Image Key <span className="ml-1 font-normal text-gray-400">(file-server key — optional)</span>
            </label>
            <input type="text" value={entryForm.imageKey ?? ''}
              onChange={(e) => setEF('imageKey', e.target.value || null)}
              placeholder="e.g. history/1962-founding.jpg"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent font-mono" />
          </div>

          {/* Language tabs */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setEntryLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${entryLang === l.key ? 'bg-white text-slate-700 border-b-2 border-slate-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {LANGS.map(({ key: l, dir: d }) => {
                if (l !== entryLang) return null;
                const fc = l === 'ar' ? 'font-arabic' : '';
                const titleKey = `title${l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar'}` as keyof HistoryEntryForm;
                const descKey = `description${l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar'}` as keyof HistoryEntryForm;
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Title {l === 'en' && <span className="text-red-500">*</span>}
                      </label>
                      <input dir={d} type="text" value={entryForm[titleKey] as string}
                        onChange={(e) => setEF(titleKey, e.target.value)}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Description {l === 'en' && <span className="text-red-500">*</span>}
                      </label>
                      <textarea dir={d} rows={4} value={entryForm[descKey] as string}
                        onChange={(e) => setEF(descKey, e.target.value)}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setEntryModal(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSaveEntry} disabled={savingEntry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {savingEntry && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingEntry ? 'Save Changes' : 'Add Entry'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        isOpen={deleteEntry !== null}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDeleteEntry}
        title={`Delete ${deleteEntry?.year} — ${deleteEntry?.titleEn}?`}
        description="This will permanently remove the history entry from the timeline."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={deletingEntry}
      />
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

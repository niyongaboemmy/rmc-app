'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  ModalTitle, ModalDescription, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  ContentKeys,
  ANNOUNCEMENTS_DEFAULT,
  getSiteContent,
  saveSiteContent,
  tri,
  type Tri,
  type AnnouncementsContent,
  type AnnouncementItem,
  type AnnouncementPriority,
  type AnnouncementType,
} from '@/lib/content-api';
import {
  Bell, ArrowLeft, Plus, Edit2, Trash2,
  AlertTriangle, Info, Save, FileText,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
type Priority = AnnouncementPriority;
type AType = AnnouncementType;

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; badge: string; icon: React.ReactNode; row: string }> = {
  normal:  { label: 'Normal',  badge: 'bg-blue-100 text-blue-700',    icon: <Info className="w-3.5 h-3.5" />,          row: 'hover:border-blue-100'   },
  high:    { label: 'High',    badge: 'bg-orange-100 text-orange-700', icon: <Bell className="w-3.5 h-3.5" />,          row: 'hover:border-orange-100' },
  urgent:  { label: 'Urgent',  badge: 'bg-red-100 text-red-700',      icon: <AlertTriangle className="w-3.5 h-3.5" />, row: 'hover:border-red-100'    },
};

const TYPE_CONFIG: Record<AType, { label: string; badge: string }> = {
  announcement: { label: 'Announcement', badge: 'bg-blue-100 text-blue-700' },
  tender:        { label: 'Tender',       badge: 'bg-amber-100 text-amber-700' },
};

const EMPTY: AnnouncementItem = {
  title: tri(''),
  content: tri(''),
  priority: 'normal',
  type: 'announcement',
  publishAt: new Date().toISOString(),
};

/** ISO timestamp → "YYYY-MM-DD" for a date input. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → ISO timestamp (preserving the previous time-of-day). */
function fromDateInput(date: string, prevIso: string): string {
  if (!date) return prevIso;
  const prev = new Date(prevIso);
  const time = Number.isNaN(prev.getTime()) ? '00:00:00.000Z' : prev.toISOString().slice(11);
  return `${date}T${time}`;
}

function setTri(t: Tri, lang: Lang, value: string): Tri {
  return { ...t, [lang]: value };
}

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><AnnouncementsManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function AnnouncementsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [content, setContent] = useState<AnnouncementsContent>(ANNOUNCEMENTS_DEFAULT);
  const [lang, setLang] = useState<Lang>('en');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AnnouncementItem>(EMPTY);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const items = content.items;

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<AnnouncementsContent>(ContentKeys.announcements)
      .then((data) => {
        if (active && data) setContent({ ...ANNOUNCEMENTS_DEFAULT, ...data });
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

  const openCreate = () => { setEditingIndex(null); setForm({ ...EMPTY, publishAt: new Date().toISOString(), type: 'announcement' }); setModalLang('en'); setIsModalOpen(true); };
  const openEdit = (index: number) => { setEditingIndex(index); setForm({ ...items[index], type: items[index].type ?? 'announcement' }); setModalLang('en'); setIsModalOpen(true); };
  const set = <K extends keyof AnnouncementItem>(field: K, value: AnnouncementItem[K]) => setForm((p) => ({ ...p, [field]: value }));

  /** Persist a fully-formed AnnouncementsContent to the store and sync local state. */
  const persist = useCallback(async (next: AnnouncementsContent, okMsg: string) => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.announcements, next);
      setContent({ ...ANNOUNCEMENTS_DEFAULT, ...saved });
      success(okMsg);
      return true;
    } catch {
      error('Could not save. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [success, error]);

  const setHeader = useCallback((field: 'title' | 'subtitle', value: Tri) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveHeader = useCallback(async () => {
    await persist(content, 'Section header saved.');
  }, [content, persist]);

  const handleSave = useCallback(async () => {
    if (!form.title.en.trim() || !form.content.en.trim()) {
      error('English title and content are required.'); return;
    }
    const nextItems = editingIndex !== null
      ? items.map((it, i) => (i === editingIndex ? form : it))
      : [...items, form];
    const ok = await persist({ ...content, items: nextItems }, editingIndex !== null ? 'Announcement updated.' : 'Announcement added.');
    if (ok) setIsModalOpen(false);
  }, [form, editingIndex, items, content, persist, error]);

  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    const nextItems = items.filter((_, i) => i !== deleteIndex);
    const ok = await persist({ ...content, items: nextItems }, 'Deleted.');
    if (ok) setDeleteIndex(null);
  }, [deleteIndex, items, content, persist]);

  const filtered = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => priorityFilter === 'all' || item.priority === priorityFilter)
    .filter(({ item }) => typeFilter === 'all' || (item.type ?? 'announcement') === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
            <p className="text-xs text-gray-400">{loading ? 'Loading…' : `${items.length} total`}</p>
          </div>
        </div>
        <button onClick={openCreate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Announcement
        </button>
      </div>

      {/* Section header editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Section Header</h2>
          <button onClick={handleSaveHeader} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Header
          </button>
        </div>
        <LanguageTabs lang={lang} onChange={setLang} />
        {LANGS.map(({ key: l, dir }) => {
          if (l !== lang) return null;
          const fc = l === 'ar' ? 'font-arabic' : '';
          return (
            <div key={l} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
                <input dir={dir} type="text" value={content.title[l]} onChange={(e) => setHeader('title', setTri(content.title, l, e.target.value))}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
                <input dir={dir} type="text" value={content.subtitle[l]} onChange={(e) => setHeader('subtitle', setTri(content.subtitle, l, e.target.value))}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${fc}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <LanguageTabs lang={lang} onChange={setLang} />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'announcement', 'tender'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 capitalize ${typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'all' ? 'All Types' : TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'normal', 'high', 'urgent'] as const).map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 capitalize ${priorityFilter === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === 'all' ? 'All Priority' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No announcements yet.</p>
          </div>
        )}
        {filtered.map(({ item, index }) => {
          const title = item.title[lang] || item.title.en;
          const body = item.content[lang] || item.content.en;
          const pc = PRIORITY_CONFIG[item.priority];
          return (
            <div key={index} className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md bg-white border-gray-100 ${pc.row}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.priority === 'urgent' ? 'bg-red-50' : item.priority === 'high' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <span className={item.priority === 'urgent' ? 'text-red-600' : item.priority === 'high' ? 'text-orange-600' : 'text-blue-600'}>
                  {pc.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TYPE_CONFIG[item.type ?? 'announcement'].badge}`}>{TYPE_CONFIG[item.type ?? 'announcement'].label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pc.badge}`}>{item.priority}</span>
                  <span className="text-xs text-gray-400">{toDateInput(item.publishAt)}</span>
                  {item.expiresAt && <span className="text-xs text-amber-600">Deadline: {toDateInput(item.expiresAt)}</span>}
                </div>
                <p className={`text-sm font-bold text-gray-900 mb-1 line-clamp-1 ${lang === 'ar' ? 'font-arabic' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title || '—'}</p>
                <p className={`text-xs text-gray-500 line-clamp-2 ${lang === 'ar' ? 'font-arabic' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{body}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteIndex(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingIndex !== null ? 'Edit Announcement' : 'New Announcement'}</ModalTitle>
          <ModalDescription>Fill in the announcement in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['announcement', 'tender'] as AType[]).map((t) => (
                <button key={t} onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${form.type === t ? TYPE_CONFIG[t].badge + ' border-transparent' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {t === 'announcement' ? <><Bell className="w-3 h-3 inline mr-1" />Announcement</> : <><FileText className="w-3 h-3 inline mr-1" />Tender</>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(['normal', 'high', 'urgent'] as Priority[]).map((p) => (
                  <button key={p} onClick={() => set('priority', p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${form.priority === p ? PRIORITY_CONFIG[p].badge + ' border-transparent' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Publish Date</label>
              <input type="date" value={toDateInput(form.publishAt)} onChange={(e) => set('publishAt', fromDateInput(e.target.value, form.publishAt))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            </div>
          </div>

          {form.type === 'tender' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tender Deadline <span className="text-red-500">*</span></label>
              <input type="date" value={form.expiresAt ? toDateInput(form.expiresAt) : ''}
                onChange={(e) => set('expiresAt', e.target.value ? fromDateInput(e.target.value, form.expiresAt ?? new Date().toISOString()) : undefined)}
                className="w-full rounded-xl border border-amber-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              <p className="text-[11px] text-amber-600 mt-1">Deadline is shown on the homepage tender card with colour coding.</p>
            </div>
          )}

          {/* Language tabs */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setModalLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${modalLang === l.key ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {LANGS.map(({ key: l, dir }) => {
                if (l !== modalLang) return null;
                const fc = l === 'ar' ? 'font-arabic' : '';
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <input dir={dir} type="text" value={form.title[l]} onChange={(e) => set('title', setTri(form.title, l, e.target.value))}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <textarea dir={dir} rows={4} value={form.content[l]} onChange={(e) => set('content', setTri(form.content, l, e.target.value))}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingIndex !== null ? 'Save Changes' : 'Add Announcement'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} onConfirm={handleDelete} title="Delete announcement?" description="This will remove the announcement from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

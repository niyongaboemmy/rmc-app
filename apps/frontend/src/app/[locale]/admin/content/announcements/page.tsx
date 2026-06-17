'use client';

import { useState, useCallback } from 'react';
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
  Bell, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, AlertTriangle, Info,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
type Priority = 'normal' | 'high' | 'urgent';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; badge: string; icon: React.ReactNode; row: string }> = {
  normal:  { label: 'Normal',  badge: 'bg-blue-100 text-blue-700',   icon: <Info className="w-3.5 h-3.5" />,          row: 'hover:border-blue-100'   },
  high:    { label: 'High',    badge: 'bg-orange-100 text-orange-700',icon: <Bell className="w-3.5 h-3.5" />,          row: 'hover:border-orange-100' },
  urgent:  { label: 'Urgent',  badge: 'bg-red-100 text-red-700',     icon: <AlertTriangle className="w-3.5 h-3.5" />, row: 'hover:border-red-100'    },
};

interface Announcement {
  id: string;
  titleEn: string; titleRw: string; titleAr: string;
  contentEn: string; contentRw: string; contentAr: string;
  priority: Priority;
  publishAt: string;
  isActive: boolean;
}

const EMPTY: Omit<Announcement, 'id'> = {
  titleEn: '', titleRw: '', titleAr: '',
  contentEn: '', contentRw: '', contentAr: '',
  priority: 'normal',
  publishAt: new Date().toISOString().slice(0, 10),
  isActive: true,
};

const MOCK: Announcement[] = [
  {
    id: '1',
    titleEn: 'Eid al-Adha Prayer Schedule',
    titleRw: 'Gahunda y\'Isengesho rya Eid al-Adha',
    titleAr: 'جدول صلاة عيد الأضحى',
    contentEn: 'Eid prayer will be held at Amahoro National Stadium on June 16th at 07:00 AM. All members are encouraged to attend.',
    contentRw: 'Isengesho rya Eid rizabera ku Kigali Convention Centre kuwa 16 Kamena saa moya z\'inzota. Abanyamuryango bose basabwa kugira uruhare.',
    contentAr: 'ستقام صلاة العيد في ملعب أماهورو الوطني في السادس عشر من يونيو الساعة السابعة صباحاً. جميع الأعضاء مدعوون للحضور.',
    priority: 'urgent', publishAt: '2025-06-10', isActive: true,
  },
  {
    id: '2',
    titleEn: 'Membership Registration Now Open',
    titleRw: 'Kwiyandikisha mu Muryango Bifunguye',
    titleAr: 'تسجيل العضوية مفتوح الآن',
    contentEn: 'Annual membership registration for 2025 is now open. Visit your nearest RMC office or register online through the member portal.',
    contentRw: 'Kwiyandikisha mu muryango ku mwaka wa 2025 bifunguye. Sura ibiro bya RMC biri hafi yawe cyangwa iyandikishe kuri interineti.',
    contentAr: 'تسجيل العضوية السنوية لعام 2025 مفتوح الآن. قم بزيارة أقرب مكتب لـ RMC أو سجل عبر الإنترنت.',
    priority: 'normal', publishAt: '2025-06-01', isActive: true,
  },
];

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

  const [items, setItems] = useState<Announcement[]>(MOCK);
  const [lang, setLang] = useState<Lang>('en');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Announcement, 'id'>>(EMPTY);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const openCreate = () => { setEditingItem(null); setForm(EMPTY); setModalLang('en'); setIsModalOpen(true); };
  const openEdit = (item: Announcement) => { setEditingItem(item); setForm({ ...item }); setIsModalOpen(true); };
  const set = <K extends keyof Omit<Announcement, 'id'>>(field: K, value: Omit<Announcement, 'id'>[K]) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = useCallback(async () => {
    if (!form.titleEn.trim() || !form.contentEn.trim()) {
      error('English title and content are required.'); return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...form, id: i.id } : i));
      success('Announcement updated.');
    } else {
      setItems((prev) => [...prev, { ...form, id: Date.now().toString() }]);
      success('Announcement added.');
    }
    setSaving(false); setIsModalOpen(false);
  }, [form, editingItem, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    success('Deleted.'); setSaving(false); setDeleteId(null);
  }, [deleteId, success]);

  const filtered = priorityFilter === 'all' ? items : items.filter((i) => i.priority === priorityFilter);

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
            <p className="text-xs text-gray-400">{items.length} total · {items.filter((i) => i.isActive).length} active</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Announcement
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <LanguageTabs lang={lang} onChange={setLang} />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'normal', 'high', 'urgent'] as const).map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 capitalize ${priorityFilter === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === 'all' ? 'All' : p}
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
        {filtered.map((item) => {
          const title = lang === 'en' ? item.titleEn : lang === 'rw' ? item.titleRw : item.titleAr;
          const content = lang === 'en' ? item.contentEn : lang === 'rw' ? item.contentRw : item.contentAr;
          const pc = PRIORITY_CONFIG[item.priority];
          return (
            <div key={item.id} className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${item.isActive ? `bg-white border-gray-100 ${pc.row}` : 'bg-gray-50/60 border-gray-100 opacity-60'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.priority === 'urgent' ? 'bg-red-50' : item.priority === 'high' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <span className={item.priority === 'urgent' ? 'text-red-600' : item.priority === 'high' ? 'text-orange-600' : 'text-blue-600'}>
                  {pc.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pc.badge}`}>{item.priority}</span>
                  <span className="text-xs text-gray-400">{item.publishAt}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title || '—'}</p>
                <p className="text-xs text-gray-500 line-clamp-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{content}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))}>
                  {item.isActive ? <ToggleRight className="w-6 h-6 text-red-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Announcement' : 'New Announcement'}</ModalTitle>
          <ModalDescription>Fill in the announcement in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
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
              <input type="date" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
            </div>
          </div>

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
                const t = l === 'en' ? form.titleEn : l === 'rw' ? form.titleRw : form.titleAr;
                const c = l === 'en' ? form.contentEn : l === 'rw' ? form.contentRw : form.contentAr;
                const setT = (v: string) => set(l === 'en' ? 'titleEn' : l === 'rw' ? 'titleRw' : 'titleAr', v);
                const setC = (v: string) => set(l === 'en' ? 'contentEn' : l === 'rw' ? 'contentRw' : 'contentAr', v);
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <input dir={dir} type="text" value={t} onChange={(e) => setT(e.target.value)}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <textarea dir={dir} rows={4} value={c} onChange={(e) => setC(e.target.value)}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div><p className="text-sm font-semibold text-gray-800">Active</p><p className="text-xs text-gray-400">Show on homepage</p></div>
            <button type="button" onClick={() => set('isActive', !form.isActive)}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Announcement'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete announcement?" description="This will remove the announcement from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

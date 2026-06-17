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
  CalendarDays, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, Newspaper, Calendar, Clock, MapPin, Tag,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
type ItemType = 'activity' | 'event';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const CATEGORIES = ['Education', 'Social', 'Dawa', 'Health', 'Youth', 'Governance', 'Religious', 'Community', 'Other'];

interface ActivityEvent {
  id: string;
  type: ItemType;
  titleEn: string; titleRw: string; titleAr: string;
  descriptionEn: string; descriptionRw: string; descriptionAr: string;
  category: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  isActive: boolean;
}

const EMPTY: Omit<ActivityEvent, 'id'> = {
  type: 'activity',
  titleEn: '', titleRw: '', titleAr: '',
  descriptionEn: '', descriptionRw: '', descriptionAr: '',
  category: 'Education',
  date: '', time: '', location: '', imageUrl: '',
  isActive: true,
};

const MOCK: ActivityEvent[] = [
  {
    id: '1', type: 'activity',
    titleEn: 'RMC Launches Digital Madrassa Program in Kigali',
    titleRw: 'RMC Itangiye Porogaramu ya Madrassa ya Digital i Kigali',
    titleAr: 'RMC تطلق برنامج المدرسة الرقمية في كيغالي',
    descriptionEn: 'A new online learning platform for Islamic education is now accessible to students across all provinces, reaching over 2,000 children.',
    descriptionRw: 'Urubuga rushya rwo kwigira kuri internet mu burezi bw\'Ubusilamu ruraboneka ubu ku bagenzi bose muri leta yose, rugera ku bana barengeje 2,000.',
    descriptionAr: 'منصة تعليمية إلكترونية جديدة للتعليم الإسلامي متاحة الآن للطلاب في جميع المقاطعات، وتصل إلى أكثر من 2000 طفل.',
    category: 'Education', date: '2025-06-05', time: '', location: 'Kigali', imageUrl: '',
    isActive: true,
  },
  {
    id: '2', type: 'event',
    titleEn: 'Eid al-Adha National Celebration',
    titleRw: 'Ibikorwa bya Nyuma ya Eid al-Adha ku Rwego rw\'Igihugu',
    titleAr: 'احتفال وطني بعيد الأضحى',
    descriptionEn: 'National celebration of Eid al-Adha bringing together the Muslim community from all provinces.',
    descriptionRw: 'Ibikorwa bya Eid al-Adha ku rwego rw\'igihugu, bihuza umuryango w\'Abasilamu baturutse muri leta zose.',
    descriptionAr: 'الاحتفال الوطني بعيد الأضحى يجمع المجتمع المسلم من جميع المقاطعات.',
    category: 'Religious', date: '2025-06-16', time: '08:00', location: 'Amahoro National Stadium, Kigali', imageUrl: '',
    isActive: true,
  },
];

export default function ActivitiesEventsPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><ActivitiesEventsManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function ActivitiesEventsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<ActivityEvent[]>(MOCK);
  const [lang, setLang] = useState<Lang>('en');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActivityEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<ActivityEvent, 'id'>>(EMPTY);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const openCreate = (type: ItemType = 'activity') => {
    setEditingItem(null); setForm({ ...EMPTY, type }); setModalLang('en'); setIsModalOpen(true);
  };
  const openEdit = (item: ActivityEvent) => { setEditingItem(item); setForm({ ...item }); setIsModalOpen(true); };
  const set = <K extends keyof Omit<ActivityEvent, 'id'>>(field: K, value: Omit<ActivityEvent, 'id'>[K]) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = useCallback(async () => {
    if (!form.titleEn.trim() || !form.date.trim()) {
      error('English title and date are required.'); return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...form, id: i.id } : i));
      success('Item updated.');
    } else {
      setItems((prev) => [...prev, { ...form, id: Date.now().toString() }]);
      success('Item added.');
    }
    setSaving(false); setIsModalOpen(false);
  }, [form, editingItem, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    success('Item deleted.'); setSaving(false); setDeleteId(null);
  }, [deleteId, success]);

  const filtered = typeFilter === 'all' ? items : items.filter((i) => i.type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Activities & Events</h1>
            <p className="text-xs text-gray-400">{items.filter((i) => i.type === 'activity').length} activities · {items.filter((i) => i.type === 'event').length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreate('activity')} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Activity
          </button>
          <button onClick={() => openCreate('event')} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Event
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <LanguageTabs lang={lang} onChange={setLang} />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'All'], ['activity', 'Activities'], ['event', 'Events']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${typeFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No items yet.</p>
          </div>
        )}
        {filtered.map((item) => {
          const title = lang === 'en' ? item.titleEn : lang === 'rw' ? item.titleRw : item.titleAr;
          const desc = lang === 'en' ? item.descriptionEn : lang === 'rw' ? item.descriptionRw : item.descriptionAr;
          const isEvent = item.type === 'event';
          return (
            <div key={item.id} className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${item.isActive ? 'bg-white border-gray-100' : 'bg-gray-50/60 border-gray-100 opacity-60'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isEvent ? 'bg-amber-50' : 'bg-teal-50'}`}>
                {isEvent ? <Calendar className="w-4 h-4 text-amber-600" /> : <Newspaper className="w-4 h-4 text-teal-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEvent ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                    {isEvent ? 'EVENT' : 'ACTIVITY'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{item.category}
                  </span>
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title}</p>
                <p className="text-xs text-gray-500 line-clamp-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{desc}</p>
                {isEvent && item.location && (
                  <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />{item.location}
                    {item.time && <><Clock className="w-3 h-3 ml-2" />{item.time}</>}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))}>
                  {item.isActive ? <ToggleRight className="w-6 h-6 text-teal-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Item' : form.type === 'event' ? 'Add Event' : 'Add Activity'}</ModalTitle>
          <ModalDescription>Fill in the details in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Type + Category + Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
              <div className="flex gap-2">
                {(['activity', 'event'] as const).map((t) => (
                  <button key={t} onClick={() => set('type', t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${form.type === t ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          </div>

          {form.type === 'event' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time</label>
                <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Venue, City"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>

          {/* Language tabs */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setModalLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${modalLang === l.key ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {LANGS.map(({ key: l, dir }) => {
                if (l !== modalLang) return null;
                const fc = l === 'ar' ? 'font-arabic' : '';
                const t = l === 'en' ? form.titleEn : l === 'rw' ? form.titleRw : form.titleAr;
                const d = l === 'en' ? form.descriptionEn : l === 'rw' ? form.descriptionRw : form.descriptionAr;
                const setT = (v: string) => set(l === 'en' ? 'titleEn' : l === 'rw' ? 'titleRw' : 'titleAr', v);
                const setD = (v: string) => set(l === 'en' ? 'descriptionEn' : l === 'rw' ? 'descriptionRw' : 'descriptionAr', v);
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <input dir={dir} type="text" value={t} onChange={(e) => setT(e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description / Excerpt</label>
                      <textarea dir={dir} rows={3} value={d} onChange={(e) => setD(e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div><p className="text-sm font-semibold text-gray-800">Active</p><p className="text-xs text-gray-400">Show on homepage</p></div>
            <button type="button" onClick={() => set('isActive', !form.isActive)}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-teal-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Item'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete this item?" description="This will remove the item from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

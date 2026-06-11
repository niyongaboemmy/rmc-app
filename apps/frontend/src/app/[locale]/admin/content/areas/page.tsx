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
  Globe, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, X, Check,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

interface Area {
  id: string;
  titleEn: string; titleRw: string; titleAr: string;
  descriptionEn: string; descriptionRw: string; descriptionAr: string;
  itemsEn: string; itemsRw: string; itemsAr: string;
  icon: string;
  accentColor: string;
  isActive: boolean;
}

const ICON_OPTIONS = ['BookOpen', 'Heart', 'GraduationCap', 'Globe', 'Building2', 'Users', 'Star', 'Zap'];
const COLOR_OPTIONS = [
  { label: 'Green', value: 'from-rmc-green to-rmc-green-dark' },
  { label: 'Rose', value: 'from-rose-500 to-rose-700' },
  { label: 'Violet', value: 'from-violet-500 to-violet-700' },
  { label: 'Sky', value: 'from-sky-500 to-sky-700' },
  { label: 'Amber', value: 'from-amber-500 to-amber-700' },
  { label: 'Teal', value: 'from-teal-500 to-teal-700' },
];

const EMPTY: Omit<Area, 'id'> = {
  titleEn: '', titleRw: '', titleAr: '',
  descriptionEn: '', descriptionRw: '', descriptionAr: '',
  itemsEn: '', itemsRw: '', itemsAr: '',
  icon: 'Globe', accentColor: 'from-rmc-green to-rmc-green-dark',
  isActive: true,
};

const MOCK: Area[] = [
  {
    id: '1',
    titleEn: 'Dawa', titleRw: 'Dawa', titleAr: 'الدعوة',
    descriptionEn: 'Islamic outreach and propagation of the faith across Rwanda, supporting imams, madrassas, and Islamic education programs.',
    descriptionRw: 'Gutangaza Ubusilamu no kuwugambira mu Rwanda, gufasha abaImamu, amadrasah, n\'amashuri y\'Ubusilamu.',
    descriptionAr: 'التوعية الإسلامية ونشر الإسلام في أرجاء رواندا، ودعم الأئمة والمدارس وبرامج التعليم الإسلامي.',
    itemsEn: 'Imam training programs\nQuran distribution\nCommunity preaching\nIslamic literacy',
    itemsRw: 'Porogaramu zo guturisha abaImamu\nRungika za Kurani\nKubwira umuryango\nUbuzi bw\'Ubusilamu',
    itemsAr: 'برامج تدريب الأئمة\nتوزيع المصاحف\nالوعظ المجتمعي\nمحو الأمية الإسلامية',
    icon: 'BookOpen', accentColor: 'from-rmc-green to-rmc-green-dark',
    isActive: true,
  },
  {
    id: '2',
    titleEn: 'Social & Development', titleRw: 'Amibereho & Iterambere', titleAr: 'التنمية الاجتماعية',
    descriptionEn: 'Uplifting vulnerable Muslim families through welfare programs, microfinance, food assistance, and community development.',
    descriptionRw: 'Gufasha imiryango y\'Abasilamu ishonje binyuze mu bikorwa byo gufasha, inguzanyo nto, n\'iterambere.',
    descriptionAr: 'دعم الأسر المسلمة المحتاجة من خلال برامج الرعاية الاجتماعية والتمويل الأصغر والمساعدات الغذائية.',
    itemsEn: 'Zakat distribution\nOrphan support\nWidow programs\nCommunity development',
    itemsRw: 'Gutanga Zaka\nGufasha inzirakarengane\nPorogaramu z\'abapfakazi\nIterambere ry\'umuryango',
    itemsAr: 'توزيع الزكاة\nدعم الأيتام\nبرامج الأرامل\nتنمية المجتمع',
    icon: 'Heart', accentColor: 'from-rose-500 to-rose-700',
    isActive: true,
  },
];

export default function AreasPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><AreasManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function AreasManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<Area[]>(MOCK);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Area | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<Area, 'id'>>(EMPTY);

  const openCreate = () => { setEditingItem(null); setFormData(EMPTY); setLang('en'); setIsModalOpen(true); };
  const openEdit = (item: Area) => { setEditingItem(item); setFormData({ ...item }); setIsModalOpen(true); };
  const set = <K extends keyof Omit<Area, 'id'>>(field: K, value: Omit<Area, 'id'>[K]) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSave = useCallback(async () => {
    if (!formData.titleEn.trim() || !formData.descriptionEn.trim()) {
      error('English title and description are required.'); return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...formData, id: i.id } : i));
      success('Area updated.');
    } else {
      setItems((prev) => [...prev, { ...formData, id: Date.now().toString() }]);
      success('Area added.');
    }
    setSaving(false); setIsModalOpen(false);
  }, [formData, editingItem, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    success('Area deleted.'); setSaving(false); setDeleteId(null);
  }, [deleteId, success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Areas of Intervention</h1>
            <p className="text-xs text-gray-400">{items.length} area{items.length !== 1 ? 's' : ''} · {items.filter((i) => i.isActive).length} active</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-orange-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Items */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No areas yet.</p>
          </div>
        )}
        {items.map((item) => {
          const title = lang === 'en' ? item.titleEn : lang === 'rw' ? item.titleRw : item.titleAr;
          const desc = lang === 'en' ? item.descriptionEn : lang === 'rw' ? item.descriptionRw : item.descriptionAr;
          const itemsList = (lang === 'en' ? item.itemsEn : lang === 'rw' ? item.itemsRw : item.itemsAr).split('\n').filter(Boolean);
          return (
            <div key={item.id} className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${item.isActive ? 'bg-white border-gray-100 hover:border-orange-100' : 'bg-gray-50/60 border-gray-100 opacity-60'}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.accentColor} flex items-center justify-center shrink-0`}>
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{desc}</p>
                {itemsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {itemsList.slice(0, 3).map((it, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">{it}</span>
                    ))}
                    {itemsList.length > 3 && <span className="text-[10px] text-gray-400">+{itemsList.length - 3} more</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))}>
                  {item.isActive ? <ToggleRight className="w-6 h-6 text-orange-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Area' : 'Add Area'}</ModalTitle>
          <ModalDescription>Fill in the area details in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Appearance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon</label>
              <select value={formData.icon} onChange={(e) => set('icon', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Accent Color</label>
              <select value={formData.accentColor} onChange={(e) => set('accentColor', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Language tabs in modal */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${lang === l.key ? 'bg-white text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {(['en', 'rw', 'ar'] as Lang[]).map((l) => {
                if (l !== lang) return null;
                const dir = l === 'ar' ? 'rtl' : 'ltr';
                const fc = l === 'ar' ? 'font-arabic' : '';
                const t = l === 'en' ? formData.titleEn : l === 'rw' ? formData.titleRw : formData.titleAr;
                const d = l === 'en' ? formData.descriptionEn : l === 'rw' ? formData.descriptionRw : formData.descriptionAr;
                const it = l === 'en' ? formData.itemsEn : l === 'rw' ? formData.itemsRw : formData.itemsAr;
                const setT = (v: string) => set(l === 'en' ? 'titleEn' : l === 'rw' ? 'titleRw' : 'titleAr', v);
                const setD = (v: string) => set(l === 'en' ? 'descriptionEn' : l === 'rw' ? 'descriptionRw' : 'descriptionAr', v);
                const setI = (v: string) => set(l === 'en' ? 'itemsEn' : l === 'rw' ? 'itemsRw' : 'itemsAr', v);
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <input dir={dir} type="text" value={t} onChange={(e) => setT(e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <textarea dir={dir} rows={3} value={d} onChange={(e) => setD(e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sub-items <span className="text-gray-400 font-normal">(one per line)</span></label>
                      <textarea dir={dir} rows={4} value={it} onChange={(e) => setI(e.target.value)} placeholder={'Item 1\nItem 2\nItem 3'} className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div><p className="text-sm font-semibold text-gray-800">Active</p><p className="text-xs text-gray-400">Show on homepage</p></div>
            <button type="button" onClick={() => set('isActive', !formData.isActive)}>
              {formData.isActive ? <ToggleRight className="w-8 h-8 text-orange-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Area'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete this area?" description="This will remove the area from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

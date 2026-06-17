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
  Megaphone, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, ExternalLink, Link2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpdateProgram {
  id: string;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  link: string;
  buttonTitleEn: string;
  buttonTitleRw: string;
  buttonTitleAr: string;
  isActive: boolean;
}

type Lang = 'en' | 'rw' | 'ar';

const EMPTY_ITEM: Omit<UpdateProgram, 'id'> = {
  titleEn: '', titleRw: '', titleAr: '',
  link: '',
  buttonTitleEn: '', buttonTitleRw: '', buttonTitleAr: '',
  isActive: true,
};

const MOCK_ITEMS: UpdateProgram[] = [
  {
    id: '1',
    titleEn: 'Annual Scholarship Program 2025',
    titleRw: 'Porogaramu y\'Ishuri Rikirenga 2025',
    titleAr: 'برنامج المنح الدراسية السنوي 2025',
    link: 'https://rmc.rw/scholarships',
    buttonTitleEn: 'Apply Now',
    buttonTitleRw: 'Saba Ubu',
    buttonTitleAr: 'قدّم الآن',
    isActive: true,
  },
  {
    id: '2',
    titleEn: 'Eid al-Adha Community Gathering',
    titleRw: 'Ibikorwa bya Nyumba ya Eid al-Adha',
    titleAr: 'تجمع مجتمع عيد الأضحى',
    link: 'https://rmc.rw/events/eid',
    buttonTitleEn: 'Learn More',
    buttonTitleRw: 'Menya Byinshi',
    buttonTitleAr: 'اعرف أكثر',
    isActive: true,
  },
];

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

export default function UpdatesProgramsPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <UpdatesProgramsManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function UpdatesProgramsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<UpdateProgram[]>(MOCK_ITEMS);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UpdateProgram | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<UpdateProgram, 'id'>>(EMPTY_ITEM);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormData(EMPTY_ITEM);
    setLang('en');
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((item: UpdateProgram) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.titleEn.trim() || !formData.link.trim() || !formData.buttonTitleEn.trim()) {
      error('English title, link, and button title are required.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...formData, id: i.id } : i));
      success('Item updated successfully.');
    } else {
      setItems((prev) => [...prev, { ...formData, id: Date.now().toString() }]);
      success('Item added successfully.');
    }
    setSaving(false);
    setIsModalOpen(false);
  }, [formData, editingItem, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    success('Item deleted.');
    setSaving(false);
    setDeleteId(null);
  }, [deleteId, success]);

  const toggleActive = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, isActive: !i.isActive } : i));
  }, []);

  const setField = <K extends keyof Omit<UpdateProgram, 'id'>>(field: K, value: Omit<UpdateProgram, 'id'>[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Updates & Programs</h1>
            <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''} · {items.filter((i) => i.isActive).length} active</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* ── Language tabs ── */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* ── Items list ── */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No items yet. Add one above.</p>
          </div>
        )}
        {items.map((item) => {
          const title = lang === 'en' ? item.titleEn : lang === 'rw' ? item.titleRw : item.titleAr;
          const btnTitle = lang === 'en' ? item.buttonTitleEn : lang === 'rw' ? item.buttonTitleRw : item.buttonTitleAr;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                item.isActive ? 'bg-white border-gray-100 hover:border-blue-100' : 'bg-gray-50/60 border-gray-100 opacity-60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title || '—'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Link2 className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{item.link}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                    {btnTitle || '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => openEdit(item)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(item.id)}>
                  {item.isActive
                    ? <ToggleRight className="w-6 h-6 text-blue-500" />
                    : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Item' : 'Add Item'}</ModalTitle>
          <ModalDescription>Provide title and button label in all languages, plus the link URL.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Shared: Link URL */}
          <FormField label="Link URL" required>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setField('link', e.target.value)}
              placeholder="https://rmc.rw/..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FormField>

          {/* Language tabs */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    lang === l.key ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {lang === 'en' && (
                <>
                  <FormField label="Title (English)" required>
                    <input type="text" value={formData.titleEn} onChange={(e) => setField('titleEn', e.target.value)} placeholder="Annual Scholarship Program 2025" className={INPUT_CLS} />
                  </FormField>
                  <FormField label="Button Title (English)" required>
                    <input type="text" value={formData.buttonTitleEn} onChange={(e) => setField('buttonTitleEn', e.target.value)} placeholder="Apply Now" className={INPUT_CLS} />
                  </FormField>
                </>
              )}
              {lang === 'rw' && (
                <>
                  <FormField label="Title (Kinyarwanda)">
                    <input type="text" value={formData.titleRw} onChange={(e) => setField('titleRw', e.target.value)} placeholder="Porogaramu y'Ishuri Rikirenga 2025" className={INPUT_CLS} />
                  </FormField>
                  <FormField label="Button Title (Kinyarwanda)">
                    <input type="text" value={formData.buttonTitleRw} onChange={(e) => setField('buttonTitleRw', e.target.value)} placeholder="Saba Ubu" className={INPUT_CLS} />
                  </FormField>
                </>
              )}
              {lang === 'ar' && (
                <>
                  <FormField label="Title (Arabic)">
                    <input dir="rtl" type="text" value={formData.titleAr} onChange={(e) => setField('titleAr', e.target.value)} placeholder="برنامج المنح الدراسية 2025" className={`${INPUT_CLS} font-arabic`} />
                  </FormField>
                  <FormField label="Button Title (Arabic)">
                    <input dir="rtl" type="text" value={formData.buttonTitleAr} onChange={(e) => setField('buttonTitleAr', e.target.value)} placeholder="قدّم الآن" className={`${INPUT_CLS} font-arabic`} />
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <ActiveToggle isActive={formData.isActive} onChange={(v) => setField('isActive', v)} accentColor="text-blue-500" />
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className={CANCEL_BTN}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Item'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This will remove the update/program from the homepage."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={saving}
      />
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const CANCEL_BTN = 'px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors';

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

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ActiveToggle({ isActive, onChange, accentColor }: { isActive: boolean; onChange: (v: boolean) => void; accentColor: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
      <div>
        <p className="text-sm font-semibold text-gray-800">Active</p>
        <p className="text-xs text-gray-400">Show this item on the homepage</p>
      </div>
      <button type="button" onClick={() => onChange(!isActive)}>
        {isActive
          ? <ToggleRight className={`w-8 h-8 ${accentColor}`} />
          : <ToggleLeft className="w-8 h-8 text-gray-300" />}
      </button>
    </div>
  );
}

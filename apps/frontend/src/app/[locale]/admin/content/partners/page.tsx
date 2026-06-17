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
  Handshake, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, ExternalLink, Image as ImageIcon,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const CATEGORIES = ['International', 'Finance', 'Religious', 'Government', 'Humanitarian', 'Education', 'Development', 'Charity', 'Health', 'Other'];

const BADGE_COLORS: Record<string, string> = {
  International: 'bg-emerald-100 text-emerald-700',
  Finance: 'bg-sky-100 text-sky-700',
  Religious: 'bg-violet-100 text-violet-700',
  Government: 'bg-amber-100 text-amber-700',
  Humanitarian: 'bg-blue-100 text-blue-700',
  Education: 'bg-teal-100 text-teal-700',
  Development: 'bg-orange-100 text-orange-700',
  Charity: 'bg-cyan-100 text-cyan-700',
  Health: 'bg-rose-100 text-rose-700',
  Other: 'bg-gray-100 text-gray-600',
};

interface Partner {
  id: string;
  nameEn: string; nameRw: string; nameAr: string;
  category: string;
  website: string;
  logoUrl: string;
  initials: string;
  isActive: boolean;
}

const EMPTY: Omit<Partner, 'id'> = {
  nameEn: '', nameRw: '', nameAr: '',
  category: 'International',
  website: '', logoUrl: '', initials: '',
  isActive: true,
};

const MOCK: Partner[] = [
  { id: '1', nameEn: 'Organization of Islamic Cooperation', nameRw: 'Umuryango w\'Ubufatanye bw\'Abasilamu', nameAr: 'منظمة التعاون الإسلامي', category: 'International', website: 'https://www.oic-oci.org', logoUrl: '', initials: 'OIC', isActive: true },
  { id: '2', nameEn: 'Islamic Development Bank', nameRw: 'Banki y\'Iterambere ry\'Ubusilamu', nameAr: 'البنك الإسلامي للتنمية', category: 'Finance', website: 'https://www.isdb.org', logoUrl: '', initials: 'IsDB', isActive: true },
  { id: '3', nameEn: 'Muslim World League', nameRw: 'Ishyirahamwe ry\'Abasilamu b\'Isi Yose', nameAr: 'رابطة العالم الإسلامي', category: 'Religious', website: 'https://www.themwl.org', logoUrl: '', initials: 'MWL', isActive: true },
  { id: '4', nameEn: 'Government of Rwanda', nameRw: 'Leta ya Rwanda', nameAr: 'حكومة رواندا', category: 'Government', website: 'https://www.gov.rw', logoUrl: '', initials: 'GoR', isActive: true },
];

export default function PartnersPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><PartnersManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function PartnersManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<Partner[]>(MOCK);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Partner, 'id'>>(EMPTY);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const openCreate = () => { setEditingItem(null); setForm(EMPTY); setModalLang('en'); setIsModalOpen(true); };
  const openEdit = (item: Partner) => { setEditingItem(item); setForm({ ...item }); setIsModalOpen(true); };
  const set = <K extends keyof Omit<Partner, 'id'>>(field: K, value: Omit<Partner, 'id'>[K]) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = useCallback(async () => {
    if (!form.nameEn.trim() || !form.initials.trim()) {
      error('English name and initials are required.'); return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...form, id: i.id } : i));
      success('Partner updated.');
    } else {
      setItems((prev) => [...prev, { ...form, id: Date.now().toString() }]);
      success('Partner added.');
    }
    setSaving(false); setIsModalOpen(false);
  }, [form, editingItem, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    success('Partner deleted.'); setSaving(false); setDeleteId(null);
  }, [deleteId, success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Our Partners</h1>
            <p className="text-xs text-gray-400">{items.length} partner{items.length !== 1 ? 's' : ''} · {items.filter((i) => i.isActive).length} active</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Grid view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-300">
            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No partners yet.</p>
          </div>
        )}
        {items.map((item) => {
          const name = lang === 'en' ? item.nameEn : lang === 'rw' ? item.nameRw : item.nameAr;
          const badgeColor = BADGE_COLORS[item.category] || BADGE_COLORS.Other;
          return (
            <div key={item.id} className={`group relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg p-5 ${item.isActive ? 'border-gray-100 hover:border-amber-100' : 'border-gray-100 opacity-60'}`}>
              {/* Logo / Initials */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                  {item.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logoUrl} alt={item.nameEn} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-sm font-extrabold text-gray-600">{item.initials}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{item.category}</span>
              </div>

              <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{name}</p>
              {item.website && (
                <a href={item.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-amber-600 hover:underline mt-1">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">{item.website.replace('https://', '')}</span>
                </a>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))}>
                  {item.isActive ? <ToggleRight className="w-6 h-6 text-amber-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Partner' : 'Add Partner'}</ModalTitle>
          <ModalDescription>Enter partner details in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Initials / Abbreviation <span className="text-red-500">*</span></label>
              <input type="text" value={form.initials} onChange={(e) => set('initials', e.target.value)} placeholder="OIC"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website URL</label>
            <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Logo URL <span className="text-gray-400 font-normal">(optional — initials used as fallback)</span>
            </label>
            <input type="url" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>

          {/* Language tabs */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button key={l.key} onClick={() => setModalLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${modalLang === l.key ? 'bg-white text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {LANGS.map(({ key: l, dir }) => {
                if (l !== modalLang) return null;
                const fc = l === 'ar' ? 'font-arabic' : '';
                const n = l === 'en' ? form.nameEn : l === 'rw' ? form.nameRw : form.nameAr;
                const setN = (v: string) => set(l === 'en' ? 'nameEn' : l === 'rw' ? 'nameRw' : 'nameAr', v);
                return (
                  <div key={l}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name {l === 'en' && <span className="text-red-500">*</span>}</label>
                    <input dir={dir} type="text" value={n} onChange={(e) => setN(e.target.value)}
                      className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${fc}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div><p className="text-sm font-semibold text-gray-800">Active</p><p className="text-xs text-gray-400">Show on homepage</p></div>
            <button type="button" onClick={() => set('isActive', !form.isActive)}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-amber-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Partner'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove this partner?" description="This will remove the partner from the homepage." confirmLabel="Remove" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

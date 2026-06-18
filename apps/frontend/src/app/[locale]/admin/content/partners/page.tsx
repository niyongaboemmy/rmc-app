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
  Handshake, ArrowLeft, Plus, Edit2, Trash2,
  ExternalLink, Image as ImageIcon, Save,
} from 'lucide-react';
import {
  ContentKeys,
  PARTNERS_DEFAULT,
  getSiteContent,
  saveSiteContent,
  tri,
  type PartnersContent,
  type PartnerItem,
  type Tri,
} from '@/lib/content-api';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const EMPTY: PartnerItem = {
  name: '',
  sector: tri(''),
  logo: '',
  website: '',
};

const INITIAL = PARTNERS_DEFAULT;

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

  const [content, setContent] = useState<PartnersContent>(INITIAL);
  const [lang, setLang] = useState<Lang>('en');
  const [headerLang, setHeaderLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PartnerItem>(EMPTY);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const items = content.items;

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<PartnersContent>(ContentKeys.partners)
      .then((data) => {
        if (active && data) setContent({ ...INITIAL, ...data });
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

  const openCreate = () => { setEditingIndex(null); setForm(EMPTY); setModalLang('en'); setIsModalOpen(true); };
  const openEdit = (index: number) => { setEditingIndex(index); setForm({ ...items[index], sector: { ...items[index].sector } }); setModalLang('en'); setIsModalOpen(true); };
  const set = <K extends keyof PartnerItem>(field: K, value: PartnerItem[K]) => setForm((p) => ({ ...p, [field]: value }));
  const setSector = (l: Lang, value: string) => setForm((p) => ({ ...p, sector: { ...p.sector, [l]: value } }));

  // Persist the whole PartnersContent blob.
  const persist = useCallback(async (next: PartnersContent) => {
    const saved = await saveSiteContent(ContentKeys.partners, next);
    setContent((prev) => ({ ...prev, ...saved }));
  }, []);

  const setHeader = (field: 'eyebrow' | 'title' | 'lede' | 'footerNote', l: Lang, value: string) =>
    setContent((prev) => ({ ...prev, [field]: { ...(prev[field] as Tri), [l]: value } }));

  const handleSaveHeader = useCallback(async () => {
    setSaving(true);
    try {
      await persist(content);
      success('Content saved successfully.');
    } catch {
      error('Could not save content. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [content, persist, success, error]);

  const handleSaveItem = useCallback(async () => {
    if (!form.name.trim() || !form.logo.trim()) {
      error('Partner name and logo are required.'); return;
    }
    setSaving(true);
    const cleaned: PartnerItem = {
      name: form.name.trim(),
      sector: form.sector,
      logo: form.logo.trim(),
      ...(form.website && form.website.trim() ? { website: form.website.trim() } : {}),
    };
    const nextItems = editingIndex !== null
      ? items.map((it, i) => (i === editingIndex ? cleaned : it))
      : [...items, cleaned];
    const next = { ...content, items: nextItems };
    try {
      await persist(next);
      success(editingIndex !== null ? 'Partner updated.' : 'Partner added.');
      setIsModalOpen(false);
    } catch {
      error('Could not save partner. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, editingIndex, items, content, persist, success, error]);

  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    setSaving(true);
    const next = { ...content, items: items.filter((_, i) => i !== deleteIndex) };
    try {
      await persist(next);
      success('Partner deleted.');
      setDeleteIndex(null);
    } catch {
      error('Could not delete partner. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [deleteIndex, items, content, persist, success, error]);

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
            <p className="text-xs text-gray-400">{items.length} partner{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openCreate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {/* Section header editing */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-700">Section Header</h2>
          <button onClick={handleSaveHeader} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors">
            {saving || loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Loading…' : 'Save Header'}
          </button>
        </div>

        {/* Header language tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {LANGS.map((l) => (
            <button key={l.key} onClick={() => setHeaderLang(l.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${headerLang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <span>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>

        {(() => {
          const dir = headerLang === 'ar' ? 'rtl' : 'ltr';
          const fc = headerLang === 'ar' ? 'font-arabic' : '';
          return (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Eyebrow</label>
                <input dir={dir} type="text" value={content.eyebrow[headerLang]} onChange={(e) => setHeader('eyebrow', headerLang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
                <input dir={dir} type="text" value={content.title[headerLang]} onChange={(e) => setHeader('title', headerLang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lede</label>
                <textarea dir={dir} rows={3} value={content.lede[headerLang]} onChange={(e) => setHeader('lede', headerLang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none ${fc}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Footer Note</label>
                <input dir={dir} type="text" value={content.footerNote[headerLang]} onChange={(e) => setHeader('footerNote', headerLang, e.target.value)}
                  className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${fc}`} />
              </div>
            </div>
          );
        })()}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Email</label>
          <input type="email" value={content.contactEmail} onChange={(e) => setContent((prev) => ({ ...prev, contactEmail: e.target.value }))} placeholder="info@rwandamuslim.org"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
        </div>
      </div>

      {/* List language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Grid view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-300">
            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No partners yet.</p>
          </div>
        )}
        {items.map((item, index) => {
          const sector = item.sector[lang] || item.sector.en;
          return (
            <div key={index} className="group relative bg-white rounded-2xl border border-gray-100 transition-all duration-200 hover:shadow-lg hover:border-amber-100 p-5">
              {/* Logo */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logo} alt={item.name} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              </div>

              <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{item.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{sector}</p>
              {item.website && (
                <a href={item.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-amber-600 hover:underline mt-2">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">{item.website.replace('https://', '')}</span>
                </a>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-50">
                <button onClick={() => openEdit(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteIndex(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingIndex !== null ? 'Edit Partner' : 'Add Partner'}</ModalTitle>
          <ModalDescription>Enter the partner brand, sector (all three languages), logo and website.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Shared fields */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Brand Name <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(not translated)</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ADEF"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Logo Path / URL <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.logo} onChange={(e) => set('logo', e.target.value)} placeholder="/partners/adef.png"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="url" value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
          </div>

          {/* Sector — language tabs */}
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
                return (
                  <div key={l}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sector {l === 'en' && <span className="text-red-500">*</span>}</label>
                    <input dir={dir} type="text" value={form.sector[l]} onChange={(e) => setSector(l, e.target.value)} placeholder="Education Foundation"
                      className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${fc}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSaveItem} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingIndex !== null ? 'Save Changes' : 'Add Partner'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} onConfirm={handleDelete} title="Remove this partner?" description="This will remove the partner from the homepage." confirmLabel="Remove" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  AREAS_DEFAULT,
  getSiteContent,
  saveSiteContent,
  tri,
  type AreasContent,
  type AreaItem,
  type Tri,
} from '@/lib/content-api';
import { uploadAreaImage } from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';
import {
  Globe, ArrowLeft, Plus, Edit2, Trash2, Save,
  Upload, X, ImageIcon, Loader2,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const ICON_OPTIONS = ['BookOpen', 'Heart', 'GraduationCap', 'Globe'];

const EMPTY_ITEM: AreaItem = {
  icon: 'Globe',
  slug: '',
  title: tri(''),
  description: tri(''),
  richContent: tri(''),
  imageKey: '',
  galleryImages: [],
};

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

  const [content, setContent] = useState<AreasContent>(AREAS_DEFAULT);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<AreaItem>(EMPTY_ITEM);

  // Upload state
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getSiteContent<AreasContent>(ContentKeys.areas)
      .then((data) => {
        if (active && data) setContent({ ...AREAS_DEFAULT, ...data });
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const persist = useCallback(async (next: AreasContent, message: string) => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(ContentKeys.areas, next);
      setContent({ ...AREAS_DEFAULT, ...saved });
      success(message);
      return true;
    } catch {
      error('Could not save content. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [success, error]);

  // ── Header editing ──
  const setHeader = useCallback(<K extends 'eyebrow' | 'title' | 'titleAccent' | 'lede'>(field: K, l: Lang, value: string) => {
    setContent((prev) => ({ ...prev, [field]: { ...prev[field], [l]: value } as Tri }));
  }, []);

  const handleSaveHeader = useCallback(() => {
    void persist(content, 'Section header saved.');
  }, [content, persist]);

  // ── Item CRUD ──
  const openCreate = () => {
    setEditingIndex(null);
    setFormData(EMPTY_ITEM);
    setLang('en');
    setIsModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    const item = content.items[index];
    setFormData({
      icon: item.icon,
      slug: item.slug ?? '',
      title: { ...item.title },
      description: { ...item.description },
      richContent: item.richContent ? { ...item.richContent } : tri(''),
      imageKey: item.imageKey ?? '',
      galleryImages: item.galleryImages ? [...item.galleryImages] : [],
    });
    setIsModalOpen(true);
  };

  const setItemField = (field: 'title' | 'description' | 'richContent', l: Lang, value: string) =>
    setFormData((p) => ({ ...p, [field]: { ...((p[field] as Record<string, string> | undefined) ?? {}), [l]: value } }));

  const handleSaveItem = useCallback(async () => {
    if (!formData.title.en.trim() || !formData.description.en.trim()) {
      error('English title and description are required.'); return;
    }
    const items = editingIndex !== null
      ? content.items.map((it, i) => (i === editingIndex ? formData : it))
      : [...content.items, formData];
    const ok = await persist({ ...content, items }, editingIndex !== null ? 'Area updated.' : 'Area added.');
    if (ok) setIsModalOpen(false);
  }, [formData, editingIndex, content, persist, error]);

  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    const items = content.items.filter((_, i) => i !== deleteIndex);
    const ok = await persist({ ...content, items }, 'Area deleted.');
    if (ok) setDeleteIndex(null);
  }, [deleteIndex, content, persist]);

  // ── Image uploads ──
  const handleHeroFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setHeroUploading(true);
    setHeroProgress(0);
    try {
      const key = await uploadAreaImage(file, 'areas', (p) => setHeroProgress(p));
      setFormData((p) => ({ ...p, imageKey: key }));
      success('Hero image uploaded.');
    } catch {
      error('Hero image upload failed. Please try again.');
    } finally {
      setHeroUploading(false);
    }
  }, [success, error]);

  const handleGalleryFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';
    setGalleryUploading(true);
    try {
      for (const file of files) {
        const key = await uploadAreaImage(file, 'areas-gallery');
        setFormData((p) => ({ ...p, galleryImages: [...(p.galleryImages ?? []), key] }));
      }
      success(files.length === 1 ? 'Gallery image added.' : `${files.length} images added.`);
    } catch {
      error('Gallery upload failed. Please try again.');
    } finally {
      setGalleryUploading(false);
    }
  }, [success, error]);

  const removeGalleryImage = useCallback((idx: number) => {
    setFormData((p) => ({ ...p, galleryImages: (p.galleryImages ?? []).filter((_, i) => i !== idx) }));
  }, []);

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
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Areas of Intervention</h1>
            <p className="text-xs text-gray-400">{content.items.length} area{content.items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openCreate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-orange-600/20 transition-colors">
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>

      {/* Language tabs */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* Section header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Section Header — {LANGS.find((l) => l.key === lang)?.label}</h2>
          <button onClick={handleSaveHeader} disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors">
            {saving || loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Loading…' : 'Save Header'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Eyebrow</label>
            <input dir={dir} type="text" value={content.eyebrow[lang]} onChange={(e) => setHeader('eyebrow', lang, e.target.value)}
              className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${fontClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
              <input dir={dir} type="text" value={content.title[lang]} onChange={(e) => setHeader('title', lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${fontClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title Accent</label>
              <input dir={dir} type="text" value={content.titleAccent[lang]} onChange={(e) => setHeader('titleAccent', lang, e.target.value)}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${fontClass}`} />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lede</label>
          <textarea dir={dir} rows={3} value={content.lede[lang]} onChange={(e) => setHeader('lede', lang, e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${fontClass}`} />
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {!loading && content.items.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No areas yet.</p>
          </div>
        )}
        {content.items.map((item, index) => {
          const title = item.title[lang]?.trim() ? item.title[lang] : item.title.en;
          const desc = item.description[lang]?.trim() ? item.description[lang] : item.description.en;
          const galleryCount = item.galleryImages?.length ?? 0;
          return (
            <div key={index} className="group flex gap-4 p-5 rounded-2xl border bg-white border-gray-100 hover:border-orange-100 transition-all duration-200 hover:shadow-md">
              {/* Thumbnail or icon */}
              {item.imageKey ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(item.imageKey)} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title}</p>
                <p className="text-xs text-gray-500 line-clamp-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{desc}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">Icon: {item.icon}</span>
                  {item.imageKey && <span className="text-[10px] uppercase tracking-wide text-rmc-green">✓ Hero image</span>}
                  {galleryCount > 0 && <span className="text-[10px] uppercase tracking-wide text-rmc-gold">{galleryCount} gallery image{galleryCount !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteIndex(index)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden file inputs */}
      <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHeroFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryFileChange} />

      {/* Edit / Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingIndex !== null ? 'Edit Area' : 'Add Area'}</ModalTitle>
          <ModalDescription>Fill in the area details in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Icon + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon <span className="font-normal text-gray-400">(fallback)</span></label>
              <select value={formData.icon} onChange={(e) => setFormData((p) => ({ ...p, icon: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Slug <span className="text-red-500">*</span>
                <span className="ml-1 text-gray-400 font-normal">(URL path)</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="e.g. education"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Hero image upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Cover / Hero Image <span className="ml-1 font-normal text-gray-400">(replaces icon on cards)</span>
            </label>
            {formData.imageKey ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(formData.imageKey)} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, imageKey: '' }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-red-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                disabled={heroUploading}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-60"
              >
                {heroUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-semibold">{heroProgress}%</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-semibold">Click to upload hero image</span>
                    <span className="text-[10px]">JPEG · PNG · WebP · max 10 MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Gallery images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">
                Gallery Images <span className="ml-1 font-normal text-gray-400">({formData.galleryImages?.length ?? 0} images — shown on detail page)</span>
              </label>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-60"
              >
                {galleryUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {galleryUploading ? 'Uploading…' : 'Add Images'}
              </button>
            </div>
            {(formData.galleryImages?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {formData.galleryImages!.map((key, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(key)} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {galleryUploading && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-orange-300 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                No gallery images yet. Click &ldquo;Add Images&rdquo; to upload.
              </div>
            )}
          </div>

          {/* Language tabs */}
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
                const d = l === 'ar' ? 'rtl' : 'ltr';
                const fc = l === 'ar' ? 'font-arabic' : '';
                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <input dir={d} type="text" value={formData.title[l]} onChange={(e) => setItemField('title', l, e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description {l === 'en' && <span className="text-red-500">*</span>}</label>
                      <textarea dir={d} rows={3} value={formData.description[l]} onChange={(e) => setItemField('description', l, e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${fc}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Rich Content <span className="ml-1 font-normal text-gray-400">(HTML — shown on detail page)</span>
                      </label>
                      <textarea dir={d} rows={6} value={formData.richContent?.[l] ?? ''} onChange={(e) => setItemField('richContent', l, e.target.value)}
                        placeholder="<p>Full description shown on the area detail page...</p>"
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y font-mono ${fc}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={handleSaveItem} disabled={saving || heroUploading || galleryUploading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingIndex !== null ? 'Save Changes' : 'Add Area'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmModal isOpen={deleteIndex !== null} onClose={() => setDeleteIndex(null)} onConfirm={handleDelete} title="Delete this area?" description="This will remove the area from the homepage." confirmLabel="Delete" cancelLabel="Keep" variant="danger" isLoading={saving} />
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

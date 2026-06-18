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
  UPDATES_DEFAULT,
  getSiteContent,
  saveSiteContent,
  pick,
  tri,
  type Tri,
  type UpdateSlide,
  type UpdatesContent,
} from '@/lib/content-api';
import {
  Megaphone, ArrowLeft, Plus, Edit2, Trash2,
  ExternalLink, Link2, Save,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'rw' | 'ar';

/** A slide plus a local-only id for list management. */
type SlideRow = UpdateSlide & { id: string };

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

const ICON_OPTIONS = ['GraduationCap', 'Users', 'Heart', 'Globe'];

const EMPTY_SLIDE: UpdateSlide = {
  badge: tri(''),
  title: tri(''),
  description: tri(''),
  cta: tri(''),
  ctaHref: '',
  icon: 'GraduationCap',
  image: '',
  imageAlt: '',
  statValue: '',
  statLabel: tri(''),
};

let rowSeq = 0;
const newId = () => `row-${Date.now()}-${rowSeq++}`;

const withIds = (items: UpdateSlide[]): SlideRow[] =>
  items.map((s) => ({ ...s, id: newId() }));

const stripId = ({ id: _id, ...slide }: SlideRow): UpdateSlide => slide;

const triKey: Record<Lang, keyof Tri> = { en: 'en', rw: 'rw', ar: 'ar' };

// ─── Page ───────────────────────────────────────────────────────────────────

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

  const [heading, setHeading] = useState<Tri>(UPDATES_DEFAULT.heading);
  const [items, setItems] = useState<SlideRow[]>(() => withIds(UPDATES_DEFAULT.items));
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SlideRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateSlide>(EMPTY_SLIDE);

  // Load any previously saved content; fall back to defaults if none exists.
  useEffect(() => {
    let active = true;
    getSiteContent<UpdatesContent>(ContentKeys.updates)
      .then((data) => {
        if (active && data) {
          const merged = { ...UPDATES_DEFAULT, ...data };
          setHeading(merged.heading);
          setItems(withIds(merged.items));
        }
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

  /** Persist the whole UpdatesContent to the store. */
  const persist = useCallback(
    async (nextHeading: Tri, nextItems: SlideRow[]) => {
      const full: UpdatesContent = {
        heading: nextHeading,
        items: nextItems.map(stripId),
      };
      await saveSiteContent(ContentKeys.updates, full);
    },
    [],
  );

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormData(EMPTY_SLIDE);
    setLang('en');
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((item: SlideRow) => {
    setEditingItem(item);
    setFormData(stripId(item));
    setLang('en');
    setIsModalOpen(true);
  }, []);

  const setField = useCallback(<K extends keyof UpdateSlide>(field: K, value: UpdateSlide[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setTriField = useCallback(
    (field: 'badge' | 'title' | 'description' | 'cta' | 'statLabel', value: string) => {
      setFormData((prev) => ({ ...prev, [field]: { ...prev[field], [triKey[lang]]: value } }));
    },
    [lang],
  );

  const handleSave = useCallback(async () => {
    if (!formData.badge.en.trim() || !formData.title.en.trim() || !formData.cta.en.trim()) {
      error('English badge, title, and CTA are required.');
      return;
    }
    setSaving(true);
    const next = editingItem
      ? items.map((i) => (i.id === editingItem.id ? { ...formData, id: i.id } : i))
      : [...items, { ...formData, id: newId() }];
    try {
      await persist(heading, next);
      setItems(next);
      success(editingItem ? 'Item updated successfully.' : 'Item added successfully.');
      setIsModalOpen(false);
    } catch {
      error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, editingItem, items, heading, persist, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    const next = items.filter((i) => i.id !== deleteId);
    try {
      await persist(heading, next);
      setItems(next);
      success('Item deleted.');
      setDeleteId(null);
    } catch {
      error('Could not delete. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [deleteId, items, heading, persist, success, error]);

  const handleSaveHeading = useCallback(async () => {
    setSaving(true);
    try {
      await persist(heading, items);
      success('Section heading saved.');
    } catch {
      error('Could not save heading. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [heading, items, persist, success, error]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fc = lang === 'ar' ? 'font-arabic' : '';

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
            <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* ── Section heading (Tri) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">Section Heading</h2>
          <button
            onClick={handleSaveHeading}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            {saving || loading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Loading…' : 'Save Heading'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LANGS.map((l) => (
            <div key={l.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Heading ({l.label}){l.key === 'en' && <span className="text-red-500"> *</span>}
              </label>
              <input
                dir={l.dir}
                type="text"
                value={heading[triKey[l.key]]}
                onChange={(e) => setHeading((prev) => ({ ...prev, [triKey[l.key]]: e.target.value }))}
                placeholder="Updates & Programs"
                className={`${INPUT_CLS} ${l.key === 'ar' ? 'font-arabic' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Language tabs (list preview) ── */}
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
          const title = pick(item.title, lang);
          const badge = pick(item.badge, lang);
          const cta = pick(item.cta, lang);
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 p-5 rounded-2xl border bg-white border-gray-100 hover:border-blue-100 transition-all duration-200 hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{title || '—'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                    {badge || '—'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Link2 className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{item.ctaHref || '—'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-500 font-medium border border-gray-100">
                    {cta || '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.ctaHref && (
                  <a
                    href={item.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
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
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingItem ? 'Edit Item' : 'Add Item'}</ModalTitle>
          <ModalDescription>Provide the slide content in all languages, plus icon, image, link, and stat.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Non-translated fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Icon" required>
              <select
                value={formData.icon}
                onChange={(e) => setField('icon', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </FormField>
            <FormField label="CTA Link (href)">
              <input
                type="text"
                value={formData.ctaHref}
                onChange={(e) => setField('ctaHref', e.target.value)}
                placeholder="/services"
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Image URL">
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setField('image', e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Image Alt Text">
              <input
                type="text"
                value={formData.imageAlt}
                onChange={(e) => setField('imageAlt', e.target.value)}
                placeholder="Graduation caps thrown in celebration"
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Stat Value">
              <input
                type="text"
                value={formData.statValue}
                onChange={(e) => setField('statValue', e.target.value)}
                placeholder="500+"
                className={INPUT_CLS}
              />
            </FormField>
          </div>

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
              <FormField label={`Badge (${LANGS.find((l) => l.key === lang)?.label})`} required={lang === 'en'}>
                <input dir={dir} type="text" value={formData.badge[triKey[lang]]} onChange={(e) => setTriField('badge', e.target.value)} placeholder="Scholarships 2025" className={`${INPUT_CLS} ${fc}`} />
              </FormField>
              <FormField label={`Title (${LANGS.find((l) => l.key === lang)?.label})`} required={lang === 'en'}>
                <input dir={dir} type="text" value={formData.title[triKey[lang]]} onChange={(e) => setTriField('title', e.target.value)} placeholder="Apply for the RMC Education Scholarship Program" className={`${INPUT_CLS} ${fc}`} />
              </FormField>
              <FormField label={`Description (${LANGS.find((l) => l.key === lang)?.label})`}>
                <textarea dir={dir} rows={3} value={formData.description[triKey[lang]]} onChange={(e) => setTriField('description', e.target.value)} placeholder="Full and partial scholarships…" className={`${INPUT_CLS} resize-none ${fc}`} />
              </FormField>
              <FormField label={`CTA Label (${LANGS.find((l) => l.key === lang)?.label})`} required={lang === 'en'}>
                <input dir={dir} type="text" value={formData.cta[triKey[lang]]} onChange={(e) => setTriField('cta', e.target.value)} placeholder="Apply Now" className={`${INPUT_CLS} ${fc}`} />
              </FormField>
              <FormField label={`Stat Label (${LANGS.find((l) => l.key === lang)?.label})`}>
                <input dir={dir} type="text" value={formData.statLabel[triKey[lang]]} onChange={(e) => setTriField('statLabel', e.target.value)} placeholder="Scholarships awarded" className={`${INPUT_CLS} ${fc}`} />
              </FormField>
            </div>
          </div>
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

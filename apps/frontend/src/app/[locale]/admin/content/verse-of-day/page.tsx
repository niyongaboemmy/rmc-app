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
  BookOpen, ArrowLeft, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, Quote,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Verse {
  id: string;
  arabicText: string;
  translationEn: string;
  translationRw: string;
  translationAr: string;
  referenceEn: string;
  referenceRw: string;
  referenceAr: string;
  isActive: boolean;
}

type Lang = 'en' | 'rw' | 'ar';

const EMPTY_VERSE: Omit<Verse, 'id'> = {
  arabicText: '',
  translationEn: '',
  translationRw: '',
  translationAr: '',
  referenceEn: '',
  referenceRw: '',
  referenceAr: '',
  isActive: true,
};

const MOCK_VERSES: Verse[] = [
  {
    id: '1',
    arabicText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translationEn: 'Indeed, with hardship [will be] ease.',
    translationRw: 'Birumvikana ko n\'ingutu hazaza ubwo bworoshye.',
    translationAr: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    referenceEn: 'Ash-Sharh 94:6',
    referenceRw: 'Ash-Sharh 94:6',
    referenceAr: 'الشرح ٩٤:٦',
    isActive: true,
  },
  {
    id: '2',
    arabicText: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    translationEn: 'Allah does not burden a soul beyond that it can bear.',
    translationRw: 'Imana ntirengurura umuntu uburemere burenzeho imbaraga ze.',
    translationAr: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    referenceEn: 'Al-Baqarah 2:286',
    referenceRw: 'Al-Baqarah 2:286',
    referenceAr: 'البقرة ٢:٢٨٦',
    isActive: true,
  },
  {
    id: '3',
    arabicText: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ',
    translationEn: 'But perhaps you hate a thing and it is good for you.',
    translationRw: 'Ariko ushobora gukunda ikintu kandi ari kibi kuri wewe.',
    translationAr: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ',
    referenceEn: 'Al-Baqarah 2:216',
    referenceRw: 'Al-Baqarah 2:216',
    referenceAr: 'البقرة ٢:٢١٦',
    isActive: false,
  },
];

// ─── Language config ──────────────────────────────────────────────────────────

const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl'; flag: string }[] = [
  { key: 'en', label: 'English', dir: 'ltr', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr', flag: 'RW' },
  { key: 'ar', label: 'Arabic', dir: 'rtl', flag: 'AR' },
];

// ─── Page wrapper with toast ──────────────────────────────────────────────────

export default function VerseOfDayPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <VerseOfDayManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

// ─── Manager ─────────────────────────────────────────────────────────────────

function VerseOfDayManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [verses, setVerses] = useState<Verse[]>(MOCK_VERSES);
  const [lang, setLang] = useState<Lang>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState<Verse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<Verse, 'id'>>(EMPTY_VERSE);

  const openCreate = useCallback(() => {
    setEditingVerse(null);
    setFormData(EMPTY_VERSE);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((verse: Verse) => {
    setEditingVerse(verse);
    setFormData({ ...verse });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.arabicText.trim() || !formData.translationEn.trim()) {
      error('Arabic text and English translation are required.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (editingVerse) {
      setVerses((prev) => prev.map((v) => v.id === editingVerse.id ? { ...formData, id: v.id } : v));
      success('Verse updated successfully.');
    } else {
      setVerses((prev) => [...prev, { ...formData, id: Date.now().toString() }]);
      success('Verse added successfully.');
    }
    setSaving(false);
    setIsModalOpen(false);
  }, [formData, editingVerse, success, error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setVerses((prev) => prev.filter((v) => v.id !== deleteId));
    success('Verse deleted.');
    setSaving(false);
    setDeleteId(null);
  }, [deleteId, success]);

  const toggleActive = useCallback((id: string) => {
    setVerses((prev) => prev.map((v) => v.id === id ? { ...v, isActive: !v.isActive } : v));
  }, []);

  const setField = useCallback((field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const activeLang = LANGS.find((l) => l.key === lang)!;

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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verse of the Day</h1>
            <p className="text-xs text-gray-400">{verses.length} verse{verses.length !== 1 ? 's' : ''} · {verses.filter((v) => v.isActive).length} active</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Verse
        </button>
      </div>

      {/* ── Language tabs ── */}
      <LanguageTabs lang={lang} onChange={setLang} />

      {/* ── Verse list ── */}
      <div className="space-y-3">
        {verses.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No verses yet. Add one above.</p>
          </div>
        )}
        {verses.map((verse) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            lang={lang}
            onEdit={() => openEdit(verse)}
            onDelete={() => setDeleteId(verse.id)}
            onToggle={() => toggleActive(verse.id)}
          />
        ))}
      </div>

      {/* ── Create/Edit modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingVerse ? 'Edit Verse' : 'Add Verse'}</ModalTitle>
          <ModalDescription>Fill in the verse content in all three languages.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {/* Arabic text — shared across all languages */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Arabic Text <span className="text-red-500">*</span>
            </label>
            <textarea
              dir="rtl"
              rows={3}
              value={formData.arabicText}
              onChange={(e) => setField('arabicText', e.target.value)}
              placeholder="أدخل الآية الكريمة..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-xl font-arabic text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Language tabs in modal */}
          <div className="border rounded-2xl border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    lang === l.key
                      ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {lang === 'en' && (
                <>
                  <FormField label="English Translation" required>
                    <textarea
                      rows={2}
                      value={formData.translationEn}
                      onChange={(e) => setField('translationEn', e.target.value)}
                      placeholder="English translation..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </FormField>
                  <FormField label="Reference (e.g. Al-Baqarah 2:286)">
                    <input
                      type="text"
                      value={formData.referenceEn}
                      onChange={(e) => setField('referenceEn', e.target.value)}
                      placeholder="Surah Name 1:1"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </FormField>
                </>
              )}
              {lang === 'rw' && (
                <>
                  <FormField label="Kinyarwanda Translation">
                    <textarea
                      rows={2}
                      value={formData.translationRw}
                      onChange={(e) => setField('translationRw', e.target.value)}
                      placeholder="Ubusobanuro mu Kinyarwanda..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </FormField>
                  <FormField label="Reference (Kinyarwanda)">
                    <input
                      type="text"
                      value={formData.referenceRw}
                      onChange={(e) => setField('referenceRw', e.target.value)}
                      placeholder="Ash-Sharh 94:6"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </FormField>
                </>
              )}
              {lang === 'ar' && (
                <>
                  <FormField label="Arabic Translation / Tafsir">
                    <textarea
                      dir="rtl"
                      rows={2}
                      value={formData.translationAr}
                      onChange={(e) => setField('translationAr', e.target.value)}
                      placeholder="التفسير بالعربية..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-arabic text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </FormField>
                  <FormField label="Reference (Arabic)">
                    <input
                      dir="rtl"
                      type="text"
                      value={formData.referenceAr}
                      onChange={(e) => setField('referenceAr', e.target.value)}
                      placeholder="الشرح ٩٤:٦"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-arabic text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Active</p>
              <p className="text-xs text-gray-400">Show this verse on the homepage</p>
            </div>
            <button
              type="button"
              onClick={() => setField('isActive', !formData.isActive)}
              className="transition-colors"
            >
              {formData.isActive
                ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editingVerse ? 'Save Changes' : 'Add Verse'}
          </button>
        </ModalFooter>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete this verse?"
        description="This will remove the verse from the rotation. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={saving}
      />
    </div>
  );
}

// ─── Verse card ───────────────────────────────────────────────────────────────

function VerseCard({
  verse, lang, onEdit, onDelete, onToggle,
}: { verse: Verse; lang: Lang; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const translation = lang === 'en' ? verse.translationEn : lang === 'rw' ? verse.translationRw : verse.translationAr;
  const reference = lang === 'en' ? verse.referenceEn : lang === 'rw' ? verse.referenceRw : verse.referenceAr;

  return (
    <div className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
      verse.isActive ? 'bg-white border-gray-100 hover:border-emerald-100' : 'bg-gray-50/60 border-gray-100 opacity-60'
    }`}>
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
        <Quote className="w-4 h-4 text-emerald-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xl font-arabic text-gray-900 mb-2 leading-loose" dir="rtl">
          {verse.arabicText}
        </p>
        {translation && (
          <p className="text-sm text-gray-500 italic mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            &ldquo;{translation}&rdquo;
          </p>
        )}
        {reference && (
          <p className="text-xs text-emerald-600 font-semibold">— {reference}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={onToggle}
          title={verse.isActive ? 'Deactivate' : 'Activate'}
        >
          {verse.isActive
            ? <ToggleRight className="w-6 h-6 text-emerald-500" />
            : <ToggleLeft className="w-6 h-6 text-gray-300" />}
        </button>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LanguageTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {LANGS.map((l) => (
        <button
          key={l.key}
          onClick={() => onChange(l.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
            lang === l.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
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

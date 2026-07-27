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
import { verseOfDayApi, type VerseOfDay, type VerseInput } from '@/lib/verseOfDayApi';
import {
  BookOpen, ArrowLeft, Plus, Edit2, Trash2, Quote,
  CalendarDays, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

/** Today's date in the browser's timezone as YYYY-MM-DD. */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalize a backend date/datetime to a YYYY-MM-DD value for <input type="date">. */
function toDateInput(d: string): string {
  return d ? d.split('T')[0] : '';
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(`${toDateInput(iso)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function extractMsg(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
  const m = e?.response?.data?.error?.message ?? e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m ?? '');
}

const EMPTY: VerseInput = {
  surah: 1,
  ayah: 1,
  arabicText: '',
  translationEn: '',
  translationRw: '',
  reference: '',
  displayDate: todayISO(),
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function VerseOfDayPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <VerseOfDayManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

// ─── Manager ────────────────────────────────────────────────────────────────

function VerseOfDayManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [verses, setVerses] = useState<VerseOfDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<VerseOfDay | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VerseOfDay | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VerseInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const list = await verseOfDayApi.adminGetAll();
      setVerses(list.map((v) => ({ ...v, displayDate: toDateInput(v.displayDate) })));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayISO();
  const todaysVerse = verses.find((v) => v.displayDate === today) ?? null;

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ ...EMPTY, displayDate: today });
    setFieldErrors({});
    setIsModalOpen(true);
  }, [today]);

  const openEdit = useCallback((v: VerseOfDay) => {
    setEditing(v);
    setForm({
      surah: v.surah,
      ayah: v.ayah,
      arabicText: v.arabicText,
      translationEn: v.translationEn,
      translationRw: v.translationRw ?? '',
      reference: v.reference,
      displayDate: toDateInput(v.displayDate),
    });
    setFieldErrors({});
    setIsModalOpen(true);
  }, []);

  const setField = useCallback((k: keyof VerseInput, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.displayDate) e.displayDate = 'Date is required.';
    if (!(Number(form.surah) >= 1 && Number(form.surah) <= 114)) e.surah = 'Surah must be between 1 and 114.';
    if (!(Number(form.ayah) >= 1)) e.ayah = 'Ayah must be 1 or more.';
    if (!form.arabicText.trim()) e.arabicText = 'Arabic text is required.';
    if (!form.translationEn.trim()) e.translationEn = 'English translation is required.';
    if (!form.reference.trim()) e.reference = 'Reference is required.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: VerseInput = {
        surah: Number(form.surah),
        ayah: Number(form.ayah),
        arabicText: form.arabicText.trim(),
        translationEn: form.translationEn.trim(),
        translationRw: form.translationRw?.trim() ? form.translationRw.trim() : null,
        reference: form.reference.trim(),
        displayDate: form.displayDate,
      };
      if (editing) {
        await verseOfDayApi.update(editing.id, payload);
        success('Verse updated successfully.');
      } else {
        await verseOfDayApi.create(payload);
        success('Verse added successfully.');
      }
      setIsModalOpen(false);
      await load();
    } catch (err: unknown) {
      const msg = extractMsg(err);
      if (/unique|duplicate|already|display_date|displayDate|scheduled/i.test(msg)) {
        setFieldErrors((p) => ({ ...p, displayDate: 'A verse is already scheduled for this date.' }));
        error('A verse is already scheduled for this date — edit that one instead.');
      } else {
        error(msg || 'Could not save the verse. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await verseOfDayApi.delete(deleteTarget.id);
      success('Verse deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      error(extractMsg(err) || 'Could not delete the verse. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors"
            aria-label="Back to content"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verse of the Day</h1>
            <p className="text-xs text-gray-400">
              {loading ? 'Loading…' : `${verses.length} scheduled verse${verses.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Verse
        </button>
      </div>

      {/* ── Today status banner ── */}
      {!loading && !loadError && (
        todaysVerse ? (
          <div className="flex items-start gap-3 rounded-xl border border-rmc-green/20 bg-rmc-green-light/60 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-rmc-green shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rmc-green-dark">Live on the homepage today</p>
              <p className="text-sm text-gray-600 truncate">
                <span className="font-arabic">{todaysVerse.arabicText}</span> — {todaysVerse.reference}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No verse set for today</p>
              <p className="text-sm text-amber-700">The homepage will show its built-in fallback verse until you add one for {formatDate(today, locale)}.</p>
            </div>
          </div>
        )
      )}

      {/* ── List / states ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-rmc-green" />
          <p className="text-sm mt-3">Loading verses…</p>
        </div>
      ) : loadError ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-300" />
          <p className="text-sm text-gray-600 mb-4">Could not load the verses.</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : verses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No verses scheduled yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verses.map((v) => (
            <VerseCard
              key={v.id}
              verse={v}
              isToday={v.displayDate === today}
              dateLabel={formatDate(v.displayDate, locale)}
              onEdit={() => openEdit(v)}
              onDelete={() => setDeleteTarget(v)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => !saving && setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editing ? 'Edit Verse' : 'Add Verse'}</ModalTitle>
          <ModalDescription>The verse whose date matches today is shown on the homepage.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Date + reference */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Display date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.displayDate}
                onChange={(e) => setField('displayDate', e.target.value)}
                className={inputCls}
              />
              {fieldErrors.displayDate && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.displayDate}</p>}
            </div>
            <div>
              <label className={labelCls}>Reference <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setField('reference', e.target.value)}
                placeholder="e.g. Ash-Sharh 94:6"
                className={inputCls}
              />
              {fieldErrors.reference && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.reference}</p>}
            </div>
          </div>

          {/* Surah + ayah */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Surah number <span className="text-red-500">*</span></label>
              <input
                type="number" min={1} max={114}
                value={form.surah}
                onChange={(e) => setField('surah', e.target.value)}
                className={inputCls}
              />
              {fieldErrors.surah && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.surah}</p>}
            </div>
            <div>
              <label className={labelCls}>Ayah number <span className="text-red-500">*</span></label>
              <input
                type="number" min={1}
                value={form.ayah}
                onChange={(e) => setField('ayah', e.target.value)}
                className={inputCls}
              />
              {fieldErrors.ayah && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.ayah}</p>}
            </div>
          </div>

          {/* Arabic text */}
          <div>
            <label className={labelCls}>Arabic text <span className="text-red-500">*</span></label>
            <textarea
              dir="rtl"
              rows={3}
              value={form.arabicText}
              onChange={(e) => setField('arabicText', e.target.value)}
              placeholder="أدخل الآية الكريمة..."
              className={`${inputCls} text-xl font-arabic resize-none`}
            />
            {fieldErrors.arabicText && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.arabicText}</p>}
          </div>

          {/* English translation */}
          <div>
            <label className={labelCls}>English translation <span className="text-red-500">*</span></label>
            <textarea
              rows={2}
              value={form.translationEn}
              onChange={(e) => setField('translationEn', e.target.value)}
              placeholder="English translation…"
              className={`${inputCls} resize-none`}
            />
            {fieldErrors.translationEn && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.translationEn}</p>}
          </div>

          {/* Kinyarwanda translation (optional) */}
          <div>
            <label className={labelCls}>Kinyarwanda translation <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              value={form.translationRw ?? ''}
              onChange={(e) => setField('translationRw', e.target.value)}
              placeholder="Ubusobanuro mu Kinyarwanda…"
              className={`${inputCls} resize-none`}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editing ? 'Save Changes' : 'Add Verse'}
          </button>
        </ModalFooter>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this verse?"
        description={deleteTarget ? `The verse scheduled for ${formatDate(deleteTarget.displayDate, locale)} will be permanently removed.` : ''}
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
  verse, isToday, dateLabel, onEdit, onDelete,
}: {
  verse: VerseOfDay;
  isToday: boolean;
  dateLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`group flex gap-4 p-5 rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
      isToday ? 'border-rmc-green/40 ring-1 ring-rmc-green/10' : 'border-gray-100'
    }`}>
      <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0 mt-0.5">
        <Quote className="w-4 h-4 text-rmc-green" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <CalendarDays className="w-3.5 h-3.5" /> {dateLabel}
          </span>
          {isToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rmc-green-light text-rmc-green text-[11px] font-semibold px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" /> Today
            </span>
          )}
          <span className="text-[11px] text-gray-400">Surah {verse.surah} : {verse.ayah}</span>
        </div>
        <p className="text-xl font-arabic text-gray-900 mb-2 leading-loose" dir="rtl">{verse.arabicText}</p>
        <p className="text-sm text-gray-500 italic mb-1">&ldquo;{verse.translationEn}&rdquo;</p>
        <p className="text-xs text-rmc-green font-semibold">— {verse.reference}</p>
      </div>

      <div className="flex items-start gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green-light transition-colors"
          aria-label="Edit verse"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Delete verse"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  announcementsApi, uploadAnnouncementFile,
  type Announcement, type AnnouncementAttachment, type AnnouncementI18n, type CreateAnnouncementDto,
} from '@/lib/announcementsApi';
import { fileUrl } from '@/lib/api';
import { NotifySubscribersButton } from '@/components/admin/NotifySubscribersButton';
import {
  Bell, ArrowLeft, Plus, Edit2, Trash2, Save,
  Upload, X, Eye, Paperclip, AlertCircle,
  CheckCircle2, Loader2, ExternalLink, Globe, FileText,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

type Lang = 'en' | 'rw' | 'ar';

const LANGS: { key: Lang; label: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English',     flag: 'EN', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW', dir: 'ltr' },
  { key: 'ar', label: 'Arabic',      flag: 'AR', dir: 'rtl' },
];

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
  normal: { badge: 'bg-blue-100 text-blue-700',    label: 'Normal'  },
  high:   { badge: 'bg-orange-100 text-orange-700', label: 'High'    },
  urgent: { badge: 'bg-red-100 text-red-700',       label: 'Urgent'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyI18n(): AnnouncementI18n { return { en: '', rw: '', ar: '' }; }

function setLang(obj: AnnouncementI18n, lang: Lang, value: string): AnnouncementI18n {
  return { ...obj, [lang]: value };
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function fromDateInput(date: string): string {
  return date ? `${date}T00:00:00.000Z` : '';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(mimeType: string) { return mimeType === 'application/pdf'; }
function isImage(mimeType: string) { return mimeType.startsWith('image/'); }

// ── Form state ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateAnnouncementDto = {
  title: '',
  content: '',
  titleI18n: emptyI18n(),
  contentI18n: emptyI18n(),
  priority: 'normal',
  publishAt: new Date().toISOString(),
  expiresAt: null,
  isPublished: true,
  attachments: [],
};

// ── Upload state ──────────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  pct: number;
  errorMsg?: string;
  result?: AnnouncementAttachment;
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function AnnouncementsAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><AnnouncementsManager /></ToastProvider>
    </ProtectedRoute>
  );
}

// ── Main manager ──────────────────────────────────────────────────────────────

function AnnouncementsManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listLang, setListLang] = useState<Lang>('en');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AnnouncementAttachment | null>(null);
  const [modalLang, setModalLang] = useState<Lang>('en');

  const [form, setForm] = useState<CreateAnnouncementDto>(EMPTY_FORM);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    announcementsApi.adminGetAll()
      .then((data) => { if (active) setItems(data); })
      .catch(() => error('Failed to load announcements.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [error]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, publishAt: new Date().toISOString() });
    setUploadQueue([]);
    setModalLang('en');
    setIsModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      titleI18n: item.titleI18n ?? { en: item.title, rw: '', ar: '' },
      contentI18n: item.contentI18n ?? { en: item.content, rw: '', ar: '' },
      priority: item.priority,
      publishAt: item.publishAt,
      expiresAt: item.expiresAt,
      isPublished: item.isPublished,
      attachments: item.attachments ?? [],
    });
    setUploadQueue([]);
    setModalLang('en');
    setIsModalOpen(true);
  }

  function set<K extends keyof CreateAnnouncementDto>(k: K, v: CreateAnnouncementDto[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // ── File upload queue ───────────────────────────────────────────────────────

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f, status: 'pending', pct: 0,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  }

  function removeQueued(id: string) {
    setUploadQueue((prev) => prev.filter((i) => i.id !== id));
  }

  function patchQueue(id: string, patch: Partial<UploadItem>) {
    setUploadQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!form.titleI18n.en.trim() || !form.contentI18n.en.trim()) {
      error('English title and description are required.'); return;
    }

    setSaving(true);

    // 1. Upload pending files
    const uploadedAttachments: AnnouncementAttachment[] = [];
    for (const item of uploadQueue.filter((i) => i.status === 'pending' || i.status === 'error')) {
      patchQueue(item.id, { status: 'uploading', pct: 0 });
      try {
        const att = await uploadAnnouncementFile(item.file, (pct) => patchQueue(item.id, { pct }));
        patchQueue(item.id, { status: 'done', pct: 100, result: att });
        uploadedAttachments.push(att);
      } catch {
        patchQueue(item.id, { status: 'error', pct: 0, errorMsg: 'Upload failed' });
      }
    }

    // 2. Build payload — keep `title`/`content` in sync with EN for plain-text fallback
    const payload: CreateAnnouncementDto = {
      ...form,
      title: form.titleI18n.en,
      content: form.contentI18n.en,
      attachments: [...form.attachments, ...uploadedAttachments],
    };

    try {
      if (editingId) {
        const updated = await announcementsApi.update(editingId, payload);
        setItems((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        success('Announcement updated.');
      } else {
        const created = await announcementsApi.create(payload);
        setItems((prev) => [created, ...prev]);
        success('Announcement created.');
      }
      setIsModalOpen(false);
    } catch {
      error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, uploadQueue, error, success]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await announcementsApi.delete(deleteId);
      setItems((prev) => prev.filter((a) => a.id !== deleteId));
      success('Announcement deleted.');
      setDeleteId(null);
    } catch {
      error('Delete failed.');
    } finally {
      setSaving(false);
    }
  }, [deleteId, error, success]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/content`}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
            <p className="text-xs text-gray-400">{loading ? 'Loading…' : `${items.length} total`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/announcements`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> View Public Page
          </Link>
          <button
            onClick={openCreate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </div>

      {/* Language switcher for list preview */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-400">Preview language:</span>
        <LanguageTabs lang={listLang} onChange={setListLang} />
      </div>

      {/* Announcement list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
            <Bell className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-gray-400">No announcements yet</p>
          <button onClick={openCreate} className="mt-4 text-sm text-blue-600 font-semibold hover:underline">
            Create your first announcement →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const title   = item.titleI18n?.[listLang]   || item.titleI18n?.en   || item.title;
            const preview = item.contentI18n?.[listLang] || item.contentI18n?.en || item.content;
            const isRtl   = listLang === 'ar';

            return (
              <div
                key={item.id}
                className="group flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md hover:border-blue-100 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.isPublished ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                      {item.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PRIORITY_STYLES[item.priority]?.badge}`}>
                      {PRIORITY_STYLES[item.priority]?.label}
                    </span>
                    {(item.attachments?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        <Paperclip className="w-2.5 h-2.5" />
                        {item.attachments.length} file{item.attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {/* i18n completeness indicators */}
                    <div className="flex gap-0.5">
                      {LANGS.map((l) => {
                        const filled = !!(item.titleI18n?.[l.key]);
                        return (
                          <span
                            key={l.key}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${filled ? 'bg-rmc-green/10 text-rmc-green' : 'bg-gray-100 text-gray-300'}`}
                          >
                            {l.flag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <p className={`text-sm font-bold text-gray-900 mb-0.5 line-clamp-1 ${isRtl ? 'font-arabic' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {title || '—'}
                  </p>
                  <p className={`text-xs text-gray-400 line-clamp-2 ${isRtl ? 'font-arabic' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {preview}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/${locale}/announcements/${item.id}`}
                      target="_blank"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
                    {item.isPublished && (
                      <NotifySubscribersButton
                        compact
                        subject={item.titleI18n?.en || item.title}
                        html={`<p><strong>${item.titleI18n?.en || item.title}</strong></p><p>${item.contentI18n?.en || item.content || ''}</p>`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300">{toDateInput(item.publishAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => !saving && setIsModalOpen(false)} size="xl">
        <ModalHeader>
          <ModalTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</ModalTitle>
          <ModalDescription>Fill in all three languages. Attach PDF documents or images.</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">

          {/* Priority + Publish date + Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priority</label>
              <div className="flex gap-1">
                {(['normal', 'high', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                      form.priority === p
                        ? PRIORITY_STYLES[p].badge + ' border-transparent'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Publish Date</label>
              <input
                type="date"
                value={toDateInput(form.publishAt)}
                onChange={(e) => set('publishAt', fromDateInput(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Expiry <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={form.expiresAt ? toDateInput(form.expiresAt) : ''}
                onChange={(e) => set('expiresAt', e.target.value ? fromDateInput(e.target.value) : null)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('isPublished', !form.isPublished)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.isPublished ? 'bg-rmc-green' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {form.isPublished ? 'Published — visible on public announcements page' : 'Draft — not visible publicly'}
            </span>
          </div>

          {/* ── Multilingual content ── */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            {/* Language tab bar */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setModalLang(l.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    modalLang === l.key
                      ? 'bg-white text-blue-600 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    form.titleI18n[l.key]
                      ? 'bg-rmc-green/10 text-rmc-green'
                      : 'bg-gray-100 text-gray-300'
                  }`}>{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 space-y-4">
              {LANGS.map(({ key: l, dir }) => {
                if (l !== modalLang) return null;
                const isAr = l === 'ar';
                const fc = isAr ? 'font-arabic' : '';
                const required = l === 'en';

                return (
                  <div key={l} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Title {required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        dir={dir}
                        type="text"
                        value={form.titleI18n[l]}
                        onChange={(e) => set('titleI18n', setLang(form.titleI18n, l, e.target.value))}
                        placeholder={l === 'en' ? 'e.g. RMC General Assembly 2026' : l === 'rw' ? 'Injiza umutwe…' : 'أدخل العنوان…'}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${fc}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Content {required && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        dir={dir}
                        rows={5}
                        value={form.contentI18n[l]}
                        onChange={(e) => set('contentI18n', setLang(form.contentI18n, l, e.target.value))}
                        placeholder={l === 'en' ? 'Write the full announcement content…' : l === 'rw' ? 'Sobanura itangazo…' : 'اكتب محتوى الإعلان…'}
                        className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none ${fc}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Attachments ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Attachments <span className="text-gray-400 font-normal">(PDF, images — max 10 MB each)</span>
            </label>

            {/* Existing saved attachments */}
            {form.attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {form.attachments.map((att) => (
                  <AttachmentRow
                    key={att.key}
                    att={att}
                    onPreview={() => setPreviewAttachment(att)}
                    onRemove={() => set('attachments', form.attachments.filter((a) => a.key !== att.key))}
                  />
                ))}
              </div>
            )}

            {/* Pending uploads */}
            {uploadQueue.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploadQueue.map((item) => (
                  <UploadRow key={item.id} item={item} onRemove={() => removeQueued(item.id)} />
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              <Upload className="w-6 h-6 text-gray-300" />
              <p className="text-sm text-gray-400">Click or drag & drop files here</p>
              <p className="text-[11px] text-gray-300">PDF, JPG, PNG, WebP</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Create Announcement'}</>}
          </button>
        </ModalFooter>
      </Modal>

      {/* Attachment preview overlay */}
      {previewAttachment && (
        <AttachmentPreviewModal att={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete announcement?"
        description="This will permanently remove the announcement from the public page."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={saving}
      />
    </div>
  );
}

// ── Language tabs ─────────────────────────────────────────────────────────────

function LanguageTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => onChange(l.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
            lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

// ── Attachment row (saved) ────────────────────────────────────────────────────

function AttachmentRow({
  att, onPreview, onRemove,
}: { att: AnnouncementAttachment; onPreview: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50">
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
        {isPdf(att.mimeType) ? <FileText className="w-4 h-4 text-red-500" /> : <Eye className="w-4 h-4 text-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 truncate">{att.name}</p>
        <p className="text-[10px] text-gray-400">{formatSize(att.size)}</p>
      </div>
      <button type="button" onClick={onPreview} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
        <Eye className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Upload row (in-progress) ──────────────────────────────────────────────────

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50">
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
        {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        {item.status === 'done'      && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {item.status === 'error'     && <AlertCircle className="w-4 h-4 text-red-500" />}
        {item.status === 'pending'   && <Paperclip className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 truncate">{item.file.name}</p>
        {item.status === 'uploading' && (
          <div className="mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${item.pct}%` }} />
          </div>
        )}
        {item.status === 'error'   && <p className="text-[10px] text-red-500">{item.errorMsg}</p>}
        {item.status === 'done'    && <p className="text-[10px] text-green-600">Uploaded</p>}
        {item.status === 'pending' && <p className="text-[10px] text-gray-400">{formatSize(item.file.size)} — will upload on save</p>}
      </div>
      {(item.status === 'pending' || item.status === 'error') && (
        <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Attachment preview modal ───────────────────────────────────────────────────

function AttachmentPreviewModal({ att, onClose }: { att: AnnouncementAttachment; onClose: () => void }) {
  const url = fileUrl(att.key);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">{att.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatSize(att.size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {isPdf(att.mimeType) ? (
            <iframe src={`${url}#toolbar=0&navpanes=0`} className="w-full h-[70vh] rounded-lg border border-gray-200" title={att.name} />
          ) : isImage(att.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={att.name} className="max-w-full max-h-[70vh] rounded-lg shadow-md object-contain" />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No preview available.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" /> Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

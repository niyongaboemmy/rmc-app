'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText, UploadCloud, X, AlertCircle,
} from 'lucide-react';

import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import {
  dawahApi,
  type DawahBookAdmin, type DawahCategory, type BookPayload, type UploadedBookFile,
  type BookLanguage, type ContentStatus,
} from '@/lib/dawahApi';

/**
 * The book create/edit form, extracted from the admin Library page so it can be
 * reused verbatim by the in-place editor on the public /dawah/library page. It
 * is self-contained: give it a `book` (or null for create) and the category
 * list, and it handles tri-lingual copy, the cover image, the protected PDF
 * upload, publishing and licensing.
 *
 * Consumers MUST render it inside a `<ToastProvider>` (it reports success/error
 * through `useToast`) and only when the user holds `dawah:manage`.
 */

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-500';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', dir: 'ltr' }, { key: 'rw', dir: 'ltr' }, { key: 'ar', dir: 'rtl' },
];
const emptyLangRecord = (): Record<Lang, string> => ({ en: '', rw: '', ar: '' });

export const BOOK_LANGS: BookLanguage[] = ['en', 'rw', 'ar', 'other'];
export const STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];
const MAX_PDF_BYTES = 25 * 1024 * 1024;

// Covers live under a PUBLIC prefix; ImageUploadField hands back a resolved URL
// but the API stores a raw key — convert at the seam.
const FILE_URL_PREFIX = fileUrl('');
const keyToUrl = (key: string | null | undefined) => (key ? fileUrl(key) : '');
const urlToKey = (url: string): string | null => (url ? url.replace(FILE_URL_PREFIX, '') : null);

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── PDF upload field (progress via raw XHR) ──────────────────────────────────

function PdfUploadField({ label, help, value, onChange }: {
  label: string;
  help?: string;
  value: UploadedBookFile | null;
  onChange: (file: UploadedBookFile | null) => void;
}) {
  const t = useTranslations('admin.dawah');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setErr('PDF only.'); return; }
    if (file.size > MAX_PDF_BYTES) { setErr(t('books.uploadFailed')); return; }
    setUploading(true); setErr(''); setPct(0);
    try {
      const uploaded = await dawahApi.admin.books.uploadWithProgress(file, setPct);
      onChange(uploaded);
    } catch {
      setErr(t('books.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      {uploading ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-sm text-gray-600">
            <UploadCloud className="h-4 w-4 text-rmc-green" />
            {t('books.uploadingPct', { pct })}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-rmc-green transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500"><FileText className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{value.fileName}</p>
            {value.fileSize > 0 && <p className="text-[11px] text-gray-400">{formatBytes(value.fileSize)}</p>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white">{t('books.replaceFile')}</button>
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={t('actions.delete')}><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm font-semibold text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
        >
          <UploadCloud className="h-5 w-5" /> {t('books.chooseFile')}
        </button>
      )}

      {help && <p className="mt-1 text-[11px] text-gray-400">{help}</p>}
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

// ── Book create / edit modal ─────────────────────────────────────────────────

export function BookModal({ book, categories, onClose, onSaved }: {
  book: DawahBookAdmin | null;
  categories: DawahCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const tl = useTranslations('dawah.library');
  const { success, error } = useToast();
  const isEdit = !!book;

  const [title, setTitle] = useState<Record<Lang, string>>(
    book ? { en: book.titleEn, rw: book.titleRw, ar: book.titleAr } : emptyLangRecord(),
  );
  const [description, setDescription] = useState<Record<Lang, string>>(
    book ? { en: book.descriptionEn, rw: book.descriptionRw, ar: book.descriptionAr } : emptyLangRecord(),
  );
  const [modalLang, setModalLang] = useState<Lang>('en');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [categoryId, setCategoryId] = useState(book?.categoryId ?? '');
  const [language, setLanguage] = useState<BookLanguage>(book?.language ?? 'en');
  const [coverUrl, setCoverUrl] = useState(keyToUrl(book?.coverImageKey));

  const [fileMeta, setFileMeta] = useState<UploadedBookFile | null>(
    book ? { fileKey: book.fileKey, fileName: book.fileName, fileSize: book.fileSize, mimeType: book.mimeType } : null,
  );
  const [allowDownload, setAllowDownload] = useState(book?.allowDownload ?? true);
  const [pageCount, setPageCount] = useState(book?.pageCount != null ? String(book.pageCount) : '');
  const [isFeatured, setIsFeatured] = useState(book?.isFeatured ?? false);
  const [status, setStatus] = useState<ContentStatus>(book?.status ?? 'draft');
  const [sortOrder, setSortOrder] = useState(book?.sortOrder != null ? String(book.sortOrder) : '');
  const [slug, setSlug] = useState(book?.slug ?? '');

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const setLang = (setter: React.Dispatch<React.SetStateAction<Record<Lang, string>>>) =>
    (val: string) => setter((prev) => ({ ...prev, [modalLang]: val }));

  const activeDir = LANGS.find((l) => l.key === modalLang)!.dir;

  const save = async () => {
    if (!title.en.trim()) { setModalLang('en'); setFormErr(t('books.titleRequired')); return; }
    if (!fileMeta) { setFormErr(t('books.fileRequired')); return; }
    setSaving(true); setFormErr('');
    const payload: BookPayload = {
      slug: slug.trim() || undefined,
      categoryId: categoryId || null,
      titleEn: title.en.trim(),
      titleRw: title.rw.trim(),
      titleAr: title.ar.trim(),
      author: author.trim(),
      descriptionEn: description.en.trim(),
      descriptionRw: description.rw.trim(),
      descriptionAr: description.ar.trim(),
      language,
      coverImageKey: urlToKey(coverUrl),
      fileKey: fileMeta.fileKey,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.fileSize,
      mimeType: fileMeta.mimeType,
      pageCount: pageCount.trim() ? Number(pageCount) : null,
      allowDownload,
      isFeatured,
      status,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
    };
    try {
      if (isEdit && book) await dawahApi.admin.books.update(book.id, payload);
      else await dawahApi.admin.books.create(payload);
      success(isEdit ? t('books.updated') : t('books.created'));
      onSaved();
    } catch {
      error(t('books.saveError'));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl" className="rounded-lg">
      <ModalHeader>
        <ModalTitle>{isEdit ? t('books.edit') : t('books.new')}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {formErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formErr}</p>}

          {/* Details — tri-lingual title + description, single author */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">{t('books.sections.content')}</h3>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setModalLang(l.key)}
                    className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      l.key === modalLang ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                  >
                    {l.key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('books.fields.title')} <span className="text-red-500">*</span></label>
              <input dir={activeDir} value={title[modalLang]} onChange={(e) => { setLang(setTitle)(e.target.value); setFormErr(''); }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('books.fields.description')}</label>
              <textarea dir={activeDir} rows={3} value={description[modalLang]} onChange={(e) => setLang(setDescription)(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('books.fields.author')}</label>
                <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('books.fields.category')}</label>
                <SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[{ value: '', label: t('courses.noCategory') }, ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', 'en') }))]}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('books.fields.language')}</label>
                <SearchableSelect
                  value={language}
                  onChange={(v) => setLanguage(v as BookLanguage)}
                  options={BOOK_LANGS.map((l) => ({ value: l, label: tl(`language.${l}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('books.fields.pageCount')}</label>
                <input type="number" min={0} value={pageCount} onChange={(e) => setPageCount(e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Cover */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('books.sections.cover')}</h3>
            <div className="w-40">
              <ImageUploadField value={coverUrl} onChange={setCoverUrl} heightClass="h-52" />
            </div>
          </section>

          {/* Book file */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('books.sections.file')}</h3>
            <PdfUploadField
              label={t('books.fields.file')}
              help={t('books.uploadHint')}
              value={fileMeta}
              onChange={setFileMeta}
            />
          </section>

          {/* Access & licensing — the three policy fields, made legible */}
          <section className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/40 p-4">
            <h3 className="text-sm font-semibold text-gray-700">{t('books.sections.policy')}</h3>

            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
                <span className="text-sm font-medium text-gray-700">{t('books.fields.allowDownload')}</span>
              </label>
              <p className="mt-1 text-[11px] text-gray-500">{t('books.allowDownloadHelp')}</p>
              {/* Honest correction: allowDownload=false is a deterrent, not protection. */}
              <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{t('books.downloadDeterrent')}</span>
              </p>
            </div>
          </section>

          {/* Publishing */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('books.sections.publishing')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('courses.fields.slug')}</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('books.col.status')}</label>
                <SearchableSelect
                  value={status}
                  onChange={(v) => setStatus(v as ContentStatus)}
                  options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('books.fields.sortOrder')}</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
                <span className="text-sm text-gray-700">{t('books.fields.featured')}</span>
              </label>
            </div>
          </section>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{t('actions.cancel')}</button>
        <button onClick={save} disabled={saving} className="rounded-lg bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50">
          {saving ? t('books.saving') : isEdit ? t('actions.save') : t('actions.create')}
        </button>
      </ModalFooter>
    </Modal>
  );
}

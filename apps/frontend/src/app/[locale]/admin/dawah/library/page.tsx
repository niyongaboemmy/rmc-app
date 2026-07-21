'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BookMarked, Plus, Pencil, Trash2, RefreshCw, Search, Eye, EyeOff, BookOpen,
  ImageOff, FileText, UploadCloud, X, AlertCircle, Lock, Globe, ExternalLink, Check,
  Download,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { StatusBadge } from '@/components/ui/Badge';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { PreviewOverlayShell, OverlayToolButton } from '@/components/ui/PreviewOverlayShell';
import {
  dawahApi,
  type DawahBookAdmin, type DawahCategory, type BookPayload, type UploadedBookFile,
  type BookLanguage, type BookVisibility, type ContentStatus,
} from '@/lib/dawahApi';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', dir: 'ltr' }, { key: 'rw', dir: 'ltr' }, { key: 'ar', dir: 'rtl' },
];
const emptyLangRecord = (): Record<Lang, string> => ({ en: '', rw: '', ar: '' });

const BOOK_LANGS: BookLanguage[] = ['en', 'rw', 'ar', 'other'];
const VISIBILITIES: BookVisibility[] = ['public', 'members'];
const STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];
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

/**
 * Compact a counter so the column stays one line at four digits — 1234 → 1.2k.
 * Intl handles the locale (Arabic gets ألف, not k) and it is memo-free here
 * because the table is capped at 100 rows.
 */
function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export default function AdminDawahLibraryPage() {
  return (
    <ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>
      <ToastProvider>
        <LibraryAdmin />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function LibraryAdmin() {
  const t = useTranslations('admin.dawah');
  const tl = useTranslations('dawah.library'); // shared language labels
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);

  const [books, setBooks] = useState<DawahBookAdmin[]>([]);
  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; book: DawahBookAdmin | null }>({ open: false, book: null });
  const [proofing, setProofing] = useState<DawahBookAdmin | null>(null);
  const [deleting, setDeleting] = useState<DawahBookAdmin | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const [page, cats] = await Promise.all([
        dawahApi.admin.books.list({ limit: 100 }),
        dawahApi.admin.categories.list(),
      ]);
      setBooks(page.items);
      setCategories(cats);
    } catch {
      setBooks([]);
      error(t('books.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, error]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => books.filter((b) => {
      if (categoryFilter && b.categoryId !== categoryFilter) return false;
      if (languageFilter && b.language !== languageFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (q) return b.titleEn.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
      return true;
    }),
    [books, q, categoryFilter, languageFilter, statusFilter],
  );

  const toggleStatus = async (book: DawahBookAdmin) => {
    const next: ContentStatus = book.status === 'published' ? 'draft' : 'published';
    setStatusBusyId(book.id);
    try {
      await dawahApi.admin.books.update(book.id, { status: next });
      success(next === 'published' ? t('books.published') : t('books.unpublished'));
      fetchBooks();
    } catch {
      error(t('books.statusError'));
    } finally {
      setStatusBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.books.remove(deleting.id);
      success(t('books.deleted'));
      setDeleting(null);
      fetchBooks();
    } catch {
      error(t('books.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10">
            <BookMarked className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{t('books.title')}</h1>
            <p className="text-sm text-gray-500">{t('books.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBooks}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className="h-4 w-4" /> {t('books.refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setModal({ open: true, book: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <Plus className="h-4 w-4" /> {t('books.new')}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('readOnly')}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('books.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 py-2.5 ps-9 pe-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green"
          />
        </div>
        <SearchableSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[{ value: '', label: t('books.allCategories') }, ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }))]}
          className="w-full sm:w-52"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
        <SearchableSelect
          value={languageFilter}
          onChange={setLanguageFilter}
          options={[{ value: '', label: t('books.allLanguages') }, ...BOOK_LANGS.map((l) => ({ value: l, label: tl(`language.${l}`) }))]}
          className="w-full sm:w-44"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
        <SearchableSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: '', label: t('books.allStatuses') }, ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))]}
          className="w-full sm:w-44"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-rmc-green" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('books.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-start">
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('books.col.cover')}</th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('books.col.title')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 lg:table-cell">{t('books.col.category')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 md:table-cell">{t('books.col.visibility')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 lg:table-cell">{t('books.col.download')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 md:table-cell" title={t('books.stats.hint')}>
                    {t('books.col.stats')}
                  </th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('books.col.status')}</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((b) => (
                  <tr key={b.id} className="align-top transition-colors hover:bg-rmc-green/[0.03]">
                    <td className="px-4 py-3.5">
                      <div className="h-12 w-9 overflow-hidden rounded border border-gray-100 bg-gray-50">
                        {b.coverImageKey ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(b.coverImageKey)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300"><ImageOff className="h-4 w-4" /></div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{localized(b, 'title', locale) || b.slug}</p>
                      {b.author && <p className="text-xs text-gray-400">{b.author}</p>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-gray-600 lg:table-cell">
                      {b.category ? localized(b.category, 'name', locale) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        b.visibility === 'members' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700',
                      )}>
                        {b.visibility === 'members' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {t(`books.visibility.${b.visibility}`)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        b.allowDownload ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {b.allowDownload ? t('books.download.on') : t('books.download.off')}
                      </span>
                    </td>
                    {/* Activity. Raw request counts, NOT unique readers — the
                        tooltip says so, and the header carries it too. A book
                        nobody has opened reads as "—", not as a pair of zeros,
                        so a genuinely idle title is obvious at a glance. */}
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      {b.viewCount === 0 && b.downloadCount === 0 ? (
                        <span className="text-gray-300" title={t('books.stats.none')}>—</span>
                      ) : (
                        <div className="flex items-center gap-3 text-xs tabular-nums text-gray-600">
                          <span
                            className="inline-flex items-center gap-1"
                            title={`${b.viewCount} ${t('books.stats.reads')} — ${t('books.stats.hint')}`}
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                            {formatCount(b.viewCount, locale)}
                            <span className="sr-only"> {t('books.stats.reads')}</span>
                          </span>
                          <span
                            className="inline-flex items-center gap-1"
                            title={`${b.downloadCount} ${t('books.stats.downloads')}`}
                          >
                            <Download className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                            {formatCount(b.downloadCount, locale)}
                            <span className="sr-only"> {t('books.stats.downloads')}</span>
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={t(`status.${b.status}`)} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setProofing(b)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                          aria-label={t('books.proof')}
                          title={t('books.proof')}
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => toggleStatus(b)}
                              disabled={statusBusyId === b.id}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green disabled:opacity-50"
                              aria-label={b.status === 'published' ? t('actions.unpublish') : t('actions.publish')}
                              title={b.status === 'published' ? t('actions.unpublish') : t('actions.publish')}
                            >
                              {b.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setModal({ open: true, book: b })}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                              aria-label={t('actions.edit')}
                              title={t('actions.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(b)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={t('actions.delete')}
                              title={t('actions.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && canManage && (
        <BookModal
          book={modal.book}
          categories={categories}
          onClose={() => setModal({ open: false, book: null })}
          onSaved={() => { setModal({ open: false, book: null }); fetchBooks(); }}
        />
      )}

      {proofing && <AdminBookProofOverlay book={proofing} locale={locale} onClose={() => setProofing(null)} />}

      <ConfirmModal
        open={!!deleting}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        onConfirm={confirmDelete}
        title={t('actions.delete')}
        message={t('books.confirmDelete')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        isLoading={deleteBusy}
      />
    </div>
  );
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
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-sm text-gray-600">
            <UploadCloud className="h-4 w-4 text-rmc-green" />
            {t('books.uploadingPct', { pct })}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-rmc-green transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500"><FileText className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{value.fileName}</p>
            {value.fileSize > 0 && <p className="text-[11px] text-gray-400">{formatBytes(value.fileSize)}</p>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white">{t('books.replaceFile')}</button>
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={t('actions.delete')}><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm font-semibold text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
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

function BookModal({ book, categories, onClose, onSaved }: {
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
  const [previewMeta, setPreviewMeta] = useState<UploadedBookFile | null>(
    book?.previewFileKey ? { fileKey: book.previewFileKey, fileName: 'excerpt.pdf', fileSize: 0, mimeType: 'application/pdf' } : null,
  );

  const [visibility, setVisibility] = useState<BookVisibility>(book?.visibility ?? 'public');
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
      previewFileKey: previewMeta?.fileKey ?? null,
      visibility,
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
    <Modal open onClose={onClose} size="2xl">
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
              <label className={labelClass}>{t('books.fields.visibility')}</label>
              <SearchableSelect
                value={visibility}
                onChange={(v) => setVisibility(v as BookVisibility)}
                options={VISIBILITIES.map((v) => ({ value: v, label: t(`books.visibility.${v}`) }))}
                triggerClassName={inputClass}
              />
              <p className="mt-1 text-[11px] text-gray-500">{t(`books.visibilityHelp.${visibility}`)}</p>
            </div>

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

            <div>
              <PdfUploadField
                label={t('books.fields.previewFile')}
                help={t('books.previewFileHelp')}
                value={previewMeta}
                onChange={setPreviewMeta}
              />
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
        <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{t('actions.cancel')}</button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50">
          {saving ? t('books.saving') : isEdit ? t('actions.save') : t('actions.create')}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ── Admin proof overlay — reads the authenticated inline stream ───────────────

function AdminBookProofOverlay({ book, locale, onClose }: {
  book: DawahBookAdmin;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const title = localized(book, 'title', locale) || book.slug;

  // Fetch the admin :id/file stream WITH the token (an iframe can't send it),
  // hand the iframe a blob URL, and revoke on unmount.
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setErr(false);
    dawahApi.admin.books
      .fileBlobUrl(book.id)
      .then((u) => { if (cancelled) { URL.revokeObjectURL(u); return; } created = u; setBlobUrl(u); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
  }, [book.id]);

  return (
    <PreviewOverlayShell onClose={onClose} labelledBy="proof-title" className="flex flex-col bg-black/90 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-gray-900/80 px-3 py-3 text-white sm:gap-3 sm:px-4">
        <FileText className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p id="proof-title" className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-gray-400">{book.fileName} · {t(`status.${book.status}`)}</p>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {blobUrl && (
            <OverlayToolButton title={t('books.openFile')} onClick={() => window.open(blobUrl, '_blank', 'noopener')} className="hidden sm:flex">
              <ExternalLink className="h-4 w-4" />
            </OverlayToolButton>
          )}
          <OverlayToolButton title={t('actions.cancel')} onClick={onClose} className="ms-1 hover:bg-red-600/50">
            <X className="h-4 w-4" />
          </OverlayToolButton>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {err ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
            <AlertCircle className="h-14 w-14 opacity-50" aria-hidden />
            <p className="text-sm text-white/60">{t('books.loadError')}</p>
          </div>
        ) : (
          <>
            {(!blobUrl || !iframeLoaded) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-rmc-green border-t-transparent" />
              </div>
            )}
            {blobUrl && (
              <iframe key={blobUrl} src={`${blobUrl}#toolbar=1`} title={title} className="h-full w-full border-0" onLoad={() => setIframeLoaded(true)} />
            )}
          </>
        )}
      </div>
    </PreviewOverlayShell>
  );
}

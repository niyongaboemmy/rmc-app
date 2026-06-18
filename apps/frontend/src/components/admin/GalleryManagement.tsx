'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Images, Upload, X, Edit2, Trash2, Eye, EyeOff,
  Plus, CheckCircle2, Loader2, ImageOff, Tag,
  LayoutGrid, Search, RefreshCw, Layers,
  ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  galleryApi,
  GalleryItem,
  generateImageVersions,
  uploadGalleryVersions,
} from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'events',     label: 'Events',     color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'ceremonies', label: 'Ceremonies', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'community',  label: 'Community',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'education',  label: 'Education',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'charity',    label: 'Charity',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'other',      label: 'Other',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

function getCategoryStyle(cat: string | null) {
  return CATEGORIES.find((c) => c.id === cat)?.color ?? 'bg-gray-100 text-gray-500 border-gray-200';
}

/** Pull a human-readable reason out of an axios/API error for toast + console. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string }; message?: string } };
    message?: string;
  };
  const status = e?.response?.status;
  const detail =
    e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message;
  if (status === 401) return 'Session expired — please sign in again.';
  if (status === 403) return 'You don’t have permission to do that.';
  if (status === 429) return 'Too many requests — wait a moment and retry.';
  return detail ? `${fallback} (${detail})` : fallback;
}

function getCategoryLabel(cat: string | null) {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat ?? 'Uncategorised';
}

// ── Upload queue (bulk) ─────────────────────────────────────────────────────

type QueueStatus = 'pending' | 'processing' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: QueueStatus;
  pct: number;
  error?: string;
}

// Maps each upload stage to a slice of the per-file 0-100 progress bar.
const STAGE_BASE: Record<'thumbnail' | 'medium' | 'original', number> = {
  thumbnail: 10, medium: 40, original: 70,
};
const STAGE_SPAN = 30;

// Shared metadata applied to every image in a bulk upload.
interface BulkForm {
  category: string;
  isPublic: boolean;
}

// ── Edit form ─────────────────────────────────────────────────────────────────

interface EditForm {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
}

// Renders children into <body> so fixed overlays cover the whole viewport,
// escaping any ancestor transform/filter that would trap `position: fixed`.
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ── Root export ───────────────────────────────────────────────────────────────

export function GalleryManagement() {
  return (
    <ToastProvider>
      <GalleryManagerInner />
    </ToastProvider>
  );
}

// ── Inner manager ─────────────────────────────────────────────────────────────

function GalleryManagerInner() {
  const { success, error } = useToast();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload modal (bulk)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [bulkForm, setBulkForm] = useState<BulkForm>({ category: '', isPublic: true });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', category: '', isPublic: true });
  const [saving, setSaving] = useState(false);

  // Preview lightbox
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // ── Load gallery ──────────────────────────────────────────────────────────

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await galleryApi.adminGetAll(undefined, 1);
      setItems(res.data);
    } catch {
      error('Failed to load gallery.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  // ── Filtered items ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter !== 'all') list = list.filter((i) => i.category === categoryFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter((i) =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, categoryFilter, searchQ]);

  // ── Upload flow (bulk) ──────────────────────────────────────────────────────

  const patchQueue = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (imgs.length < files.length) error('Some files were skipped — only images are supported.');
    if (!imgs.length) return;
    setQueue((prev) => [
      ...prev,
      ...imgs.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as QueueStatus,
        pct: 0,
      })),
    ]);
  }, [error]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => {
      const it = prev.find((q) => q.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((q) => q.id !== id);
    });
  }

  const handleUpload = useCallback(async () => {
    // Snapshot the items still needing upload (fresh or previously failed).
    const pending = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    if (!pending.length) return;
    setUploading(true);

    const created: GalleryItem[] = [];
    let ok = 0;
    let failed = 0;

    // Sequential — avoids ECONNRESET from concurrent large multipart uploads.
    for (const q of pending) {
      try {
        patchQueue(q.id, { status: 'processing', pct: 5, error: undefined });
        const versions = await generateImageVersions(q.file);

        patchQueue(q.id, { status: 'uploading', pct: STAGE_BASE.thumbnail });
        const keys = await uploadGalleryVersions({
          versions,
          onProgress: (stage, pct) =>
            patchQueue(q.id, { pct: Math.round(STAGE_BASE[stage] + (STAGE_SPAN * pct) / 100) }),
        });

        const rec = await galleryApi.create({
          fileKey: keys.fileKey,
          thumbnailKey: keys.thumbnailKey,
          mediumKey: keys.mediumKey,
          fileType: 'image',
          title: null as unknown as string,
          description: null as unknown as string,
          category: bulkForm.category || (null as unknown as string),
          isPublic: bulkForm.isPublic,
        });

        created.push(rec);
        patchQueue(q.id, { status: 'done', pct: 100 });
        ok++;
      } catch {
        patchQueue(q.id, { status: 'error', pct: 0, error: 'Upload failed' });
        failed++;
      }
    }

    if (created.length) setItems((prev) => [...created, ...prev]);
    setUploading(false);
    if (ok && failed) error(`${ok} uploaded, ${failed} failed. Retry the failed ones.`);
    else if (ok) success(`${ok} image${ok > 1 ? 's' : ''} uploaded successfully!`);
    else error(`All ${failed} upload${failed > 1 ? 's' : ''} failed.`);
  }, [queue, bulkForm, patchQueue, success, error]);

  function resetUpload() {
    setQueue((prev) => {
      prev.forEach((q) => URL.revokeObjectURL(q.preview));
      return [];
    });
    setBulkForm({ category: '', isPublic: true });
    setUploading(false);
  }

  function closeUpload() {
    resetUpload();
    setUploadOpen(false);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(item: GalleryItem) {
    setEditItem(item);
    setEditForm({
      title: item.title ?? '',
      description: item.description ?? '',
      category: item.category ?? '',
      isPublic: item.isPublic,
    });
  }

  const handleSaveEdit = useCallback(async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const updated = await galleryApi.update(editItem.id, {
        title: editForm.title.trim() || null,
        description: editForm.description.trim() || null,
        category: editForm.category || null,
        isPublic: editForm.isPublic,
      });
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
      setEditItem(null);
      success('Gallery item updated.');
    } catch (err) {
      console.error('Gallery update failed:', err);
      error(apiErrorMessage(err, 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  }, [editItem, editForm, success, error]);

  // ── Visibility toggle (inline, no modal) ──────────────────────────────────

  const toggleVisibility = useCallback(async (item: GalleryItem) => {
    try {
      const updated = await galleryApi.update(item.id, { isPublic: !item.isPublic });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      console.error('Gallery visibility toggle failed:', err);
      error(apiErrorMessage(err, 'Failed to update visibility.'));
    }
  }, [error]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await galleryApi.delete(deleteId);
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
      success('Image deleted.');
    } catch (err) {
      console.error('Gallery delete failed:', err);
      error(apiErrorMessage(err, 'Failed to delete image.'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }, [deleteId, success, error]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder='Search by title, category…'
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50/80 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 focus:bg-white transition-all"
          />
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadGallery}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { resetUpload(); setUploadOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl shadow-sm shadow-rmc-green/20 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" /> Upload Images
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <LayoutGrid className="w-3.5 h-3.5" />
          <span><strong className="text-gray-800">{items.length}</strong> total</span>
        </div>
        <span className="text-gray-200">|</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Eye className="w-3.5 h-3.5 text-rmc-green" />
          <span><strong className="text-gray-800">{items.filter((i) => i.isPublic).length}</strong> public</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <EyeOff className="w-3.5 h-3.5 text-gray-400" />
          <span><strong className="text-gray-800">{items.filter((i) => !i.isPublic).length}</strong> private</span>
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div className="flex flex-wrap gap-2">
        <CategoryPill
          label="All"
          count={items.length}
          active={categoryFilter === 'all'}
          onClick={() => setCategoryFilter('all')}
          colorClass="bg-rmc-green text-white"
          inactiveClass="bg-gray-100 text-gray-600 hover:bg-gray-200"
        />
        {CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat.id).length;
          return (
            <CategoryPill
              key={cat.id}
              label={cat.label}
              count={count}
              active={categoryFilter === cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              colorClass={cat.color.replace('border-', 'border ').split(' ').filter((c) => !c.startsWith('border')).join(' ')}
              inactiveClass="bg-gray-100 text-gray-500 hover:bg-gray-200"
            />
          );
        })}
      </div>

      {/* ── Gallery grid ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <p className="text-sm">Loading gallery…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyGallery onUpload={() => { resetUpload(); setUploadOpen(true); }} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((item, idx) => (
            <GalleryCard
              key={item.id}
              item={item}
              onPreview={() => setPreviewIndex(idx)}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeleteId(item.id)}
              onToggleVisibility={() => toggleVisibility(item)}
            />
          ))}
        </div>
      )}

      {/* ── Upload modal overlay (bulk) ── */}
      {uploadOpen && (
        <Portal>
        <UploadModal
          dragOver={dragOver}
          setDragOver={setDragOver}
          queue={queue}
          bulkForm={bulkForm}
          setBulkForm={setBulkForm}
          uploading={uploading}
          fileInputRef={fileInputRef}
          onAddFiles={addFiles}
          onRemove={removeFromQueue}
          onUpload={handleUpload}
          onDrop={handleDrop}
          onReset={resetUpload}
          onClose={closeUpload}
        />
        </Portal>
      )}

      {/* ── Edit modal ── */}
      {editItem && (
        <Portal>
        <EditModal
          item={editItem}
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
        />
        </Portal>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete image?"
        description="This will permanently remove the image and all 3 quality versions from the gallery."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={deleting}
      />

      {/* ── Preview lightbox ── */}
      {previewIndex !== null && (
        <Portal>
        <PreviewModal
          items={filtered}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNav={setPreviewIndex}
        />
        </Portal>
      )}
    </div>
  );
}

// ── Gallery card ──────────────────────────────────────────────────────────────

function GalleryCard({
  item,
  onPreview,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  item: GalleryItem;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  const imgSrc = item.thumbnailKey ? fileUrl(item.thumbnailKey) : item.fileKey ? fileUrl(item.fileKey) : null;
  const catStyle = getCategoryStyle(item.category);
  const catLabel = getCategoryLabel(item.category);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 aspect-[4/3] cursor-pointer"
      onClick={onPreview}
    >
      {/* Image */}
      {imgSrc && !imgError ? (
        <img
          src={imgSrc}
          alt={item.title ?? ''}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageOff className="w-8 h-8 text-gray-300" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Preview icon hint — center on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <Maximize2 className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Always-visible: category badge + visibility dot */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
        {item.category ? (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catStyle} backdrop-blur-sm`}>
            {catLabel}
          </span>
        ) : <span />}
        <span className={`w-2 h-2 rounded-full border border-white/60 ${item.isPublic ? 'bg-emerald-400' : 'bg-gray-400'}`} />
      </div>

      {/* Version dots bottom-left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <VersionDot label="T" title="Thumbnail" filled={!!item.thumbnailKey} />
        <VersionDot label="M" title="Medium" filled={!!item.mediumKey} />
        <VersionDot label="O" title="Original" filled={!!item.fileKey} />
      </div>

      {/* Hover title */}
      {item.title && (
        <div className="absolute bottom-6 left-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-white text-xs font-semibold truncate drop-shadow">{item.title}</p>
        </div>
      )}

      {/* Action buttons — appear on hover */}
      <div className="absolute bottom-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
        <ActionBtn
          icon={item.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          title={item.isPublic ? 'Make private' : 'Make public'}
          onClick={onToggleVisibility}
          className={item.isPublic ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}
        />
        <ActionBtn
          icon={<Edit2 className="w-3 h-3" />}
          title="Edit"
          onClick={onEdit}
          className="bg-white hover:bg-gray-100 text-gray-700"
        />
        <ActionBtn
          icon={<Trash2 className="w-3 h-3" />}
          title="Delete"
          onClick={onDelete}
          className="bg-red-500 hover:bg-red-600 text-white"
        />
      </div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick, className }: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors ${className}`}
    >
      {icon}
    </button>
  );
}

function VersionDot({ label, title, filled }: { label: string; title: string; filled: boolean }) {
  return (
    <span
      title={title}
      className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center border transition-colors ${
        filled
          ? 'bg-rmc-green border-rmc-green text-white'
          : 'bg-white/30 border-white/50 text-white/70'
      }`}
    >
      {label}
    </span>
  );
}

// ── Preview lightbox modal ────────────────────────────────────────────────────

function PreviewModal({
  items,
  index,
  onClose,
  onNav,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
}) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const imgSrc = item.mediumKey
    ? fileUrl(item.mediumKey)
    : item.fileKey
    ? fileUrl(item.fileKey)
    : item.thumbnailKey
    ? fileUrl(item.thumbnailKey)
    : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onClose, onNav]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const catStyle = getCategoryStyle(item.category);
  const catLabel = getCategoryLabel(item.category);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 select-none">
        {index + 1} / {items.length}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors backdrop-blur-sm border border-white/10"
        title="Close (Esc)"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        disabled={!hasPrev}
        className={`absolute left-3 sm:left-6 z-[60] w-11 h-11 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border ${
          hasPrev
            ? 'bg-white/10 hover:bg-white/25 border-white/20 cursor-pointer'
            : 'bg-white/5 border-white/10 opacity-30 cursor-not-allowed'
        }`}
        title="Previous (←)"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Image container — fills the full viewport width */}
      <div className="relative flex items-center justify-center w-full max-h-[88vh] px-14 sm:px-20">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.title ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <div className="w-80 h-60 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10 text-white/30 gap-3">
            <ImageOff className="w-10 h-10" />
            <span className="text-sm">No image available</span>
          </div>
        )}

        {/* Caption bar */}
        {(item.title || item.category) && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-8 pb-3 flex items-end gap-2">
            {item.category && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catStyle} shrink-0`}>
                {catLabel}
              </span>
            )}
            {item.title && (
              <p className="text-white text-sm font-semibold leading-tight truncate drop-shadow">{item.title}</p>
            )}
          </div>
        )}
      </div>

      {/* Next arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
        disabled={!hasNext}
        className={`absolute right-3 sm:right-6 z-[60] w-11 h-11 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border ${
          hasNext
            ? 'bg-white/10 hover:bg-white/25 border-white/20 cursor-pointer'
            : 'bg-white/5 border-white/10 opacity-30 cursor-not-allowed'
        }`}
        title="Next (→)"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] flex gap-1.5 max-w-[min(600px,90vw)] overflow-x-auto px-2 py-1 rounded-xl bg-black/40 backdrop-blur-sm">
          {items.map((it, i) => {
            const src = it.thumbnailKey ? fileUrl(it.thumbnailKey) : it.fileKey ? fileUrl(it.fileKey) : null;
            return (
              <button
                key={it.id}
                onClick={(e) => { e.stopPropagation(); onNav(i); }}
                className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  i === index ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
                title={it.title ?? `Image ${i + 1}`}
              >
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <ImageOff className="w-3 h-3 text-white/50" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Category pill ─────────────────────────────────────────────────────────────

function CategoryPill({
  label, count, active, onClick, colorClass, inactiveClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  colorClass: string;
  inactiveClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
        active ? `${colorClass} border-transparent shadow-sm` : `${inactiveClass} border-transparent`
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
        active ? 'bg-white/25' : 'bg-gray-200 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  queue: QueueItem[];
  bulkForm: BulkForm;
  setBulkForm: (f: BulkForm) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onUpload: () => void;
  onDrop: (e: React.DragEvent) => void;
  onReset: () => void;
  onClose: () => void;
}

function UploadModal(props: UploadModalProps) {
  const {
    dragOver, setDragOver, queue, bulkForm, setBulkForm,
    uploading, fileInputRef, onAddFiles, onRemove,
    onUpload, onDrop, onReset, onClose,
  } = props;

  const total = queue.length;
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'error').length;
  const allDone = total > 0 && doneCount === total;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!uploading ? onClose : undefined} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-in">
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-rmc-green via-rmc-green-light to-rmc-green" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rmc-green/10 flex items-center justify-center">
              <Images className="w-4.5 h-4.5 text-rmc-green" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Upload Images</h2>
              <p className="text-[11px] text-gray-400">
                {total ? `${total} selected · 3 quality versions each` : 'Add multiple images at once'}
              </p>
            </div>
          </div>
          {!uploading && (
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* ── Drop zone — always available to add more (disabled while uploading) ── */}
          <div
            onDragOver={(e) => { if (!uploading) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={uploading ? (e) => e.preventDefault() : onDrop}
            onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all duration-200 py-7 ${
              uploading
                ? 'border-gray-200 bg-gray-50/50 opacity-60 cursor-not-allowed'
                : dragOver
                ? 'border-rmc-green bg-rmc-green/5 scale-[1.01] cursor-pointer'
                : 'border-gray-200 bg-gray-50/50 hover:border-rmc-green/40 cursor-pointer'
            }`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-200 ${dragOver ? 'bg-rmc-green/15' : 'bg-gray-100'}`}>
              <Upload className={`w-5 h-5 transition-colors duration-200 ${dragOver ? 'text-rmc-green' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {dragOver ? 'Drop to add' : total ? 'Add more images' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP — max 10 MB each</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length) onAddFiles(files);
                e.target.value = '';
              }}
            />
          </div>

          {/* ── Queue ── */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rmc-green" />
                  {total} image{total > 1 ? 's' : ''}
                  {doneCount > 0 && <span className="text-emerald-600 font-medium"> · {doneCount} done</span>}
                  {errorCount > 0 && <span className="text-red-500 font-medium"> · {errorCount} failed</span>}
                </p>
                {!uploading && (
                  <button type="button" onClick={onReset} className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {queue.map((q) => (
                  <QueueRow key={q.id} item={q} uploading={uploading} onRemove={() => onRemove(q.id)} />
                ))}
              </div>
            </div>
          )}

          {/* ── Shared metadata (applies to every image) ── */}
          {total > 0 && !allDone && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Category <span className="text-gray-400 font-normal">(applied to all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={uploading} onClick={() => setBulkForm({ ...bulkForm, category: '' })}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all disabled:opacity-50 ${
                      !bulkForm.category ? 'bg-gray-700 text-white border-transparent' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                    }`}>
                    None
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} type="button" disabled={uploading} onClick={() => setBulkForm({ ...bulkForm, category: cat.id })}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all disabled:opacity-50 ${
                        bulkForm.category === cat.id ? cat.color : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Public</p>
                  <p className="text-[11px] text-gray-400">Visible on the public gallery page</p>
                </div>
                <ToggleSwitch checked={bulkForm.isPublic} onChange={(v) => setBulkForm({ ...bulkForm, isPublic: v })} />
              </div>

              <p className="text-[11px] text-gray-400">
                Tip: titles &amp; descriptions can be added per image afterwards via Edit.
              </p>
            </div>
          )}

          {/* ── Footer actions ── */}
          {total > 0 && (
            <div className="flex gap-3 pt-1">
              {allDone ? (
                <>
                  <button type="button" onClick={onReset}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors">
                    <Plus className="w-4 h-4" /> Upload More
                  </button>
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={onClose} disabled={uploading}
                    className="flex-1 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={onUpload} disabled={uploading || pendingCount === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><Upload className="w-4 h-4" /> {errorCount > 0 ? `Retry ${pendingCount} failed` : `Upload ${pendingCount} image${pendingCount > 1 ? 's' : ''}`}</>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({ item, uploading, onRemove }: { item: QueueItem; uploading: boolean; onRemove: () => void }) {
  const busy = item.status === 'processing' || item.status === 'uploading';
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-100 bg-white">
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        <img src={item.preview} alt="" className="w-full h-full object-cover" />
        {item.status === 'done' && (
          <div className="absolute inset-0 bg-emerald-500/70 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
            <ImageOff className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{item.file.name}</p>
        <p className="text-[10px] text-gray-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
        {busy && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-rmc-green rounded-full transition-all duration-300" style={{ width: `${item.pct}%` }} />
          </div>
        )}
        {item.status === 'error' && <p className="text-[10px] text-red-500 font-medium mt-0.5">{item.error}</p>}
      </div>
      <div className="shrink-0 w-7 flex items-center justify-center">
        {busy ? (
          <Loader2 className="w-4 h-4 text-rmc-green animate-spin" />
        ) : item.status === 'done' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : !uploading ? (
          <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  item, form, setForm, saving, onSave, onClose,
}: {
  item: GalleryItem;
  form: EditForm;
  setForm: (f: EditForm) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const imgSrc = item.mediumKey
    ? fileUrl(item.mediumKey)
    : item.fileKey
    ? fileUrl(item.fileKey)
    : item.thumbnailKey
    ? fileUrl(item.thumbnailKey)
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="h-1 bg-gradient-to-r from-rmc-green to-rmc-green-light" />

        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-rmc-green" /> Edit Image
          </h2>
          {!saving && (
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-5 space-y-3">
          {/* Top: form fields (left) + landscape preview (right) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3 order-2 sm:order-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="No title"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="No description"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 transition-all resize-none"
                />
              </div>
            </div>

            {/* Landscape preview — right side */}
            {imgSrc && (
              <div className="order-1 sm:order-2">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
                  <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {[
                      { v: 'T', filled: !!item.thumbnailKey, title: 'Thumbnail' },
                      { v: 'M', filled: !!item.mediumKey, title: 'Medium' },
                      { v: 'O', filled: !!item.fileKey, title: 'Original' },
                    ].map(({ v, filled, title }) => (
                      <span key={v} title={title} className={`w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center border ${filled ? 'bg-rmc-green border-rmc-green text-white' : 'bg-white/30 border-white/50 text-white/70'}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              <Tag className="w-3 h-3 inline mr-1" />Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setForm({ ...form, category: '' })}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${!form.category ? 'bg-gray-700 text-white border-transparent' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}>
                None
              </button>
              {CATEGORIES.map((cat) => (
                <button key={cat.id} type="button" onClick={() => setForm({ ...form, category: cat.id })}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${form.category === cat.id ? cat.color : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Public</p>
              <p className="text-[11px] text-gray-400">Visible on the public gallery</p>
            </div>
            <ToggleSwitch checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={onSave} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-rmc-green' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyGallery({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-rmc-green/8 flex items-center justify-center mb-4">
        <Images className="w-8 h-8 text-rmc-green/40" />
      </div>
      <p className="text-sm font-bold text-gray-700 mb-1">No images yet</p>
      <p className="text-xs text-gray-400 mb-6 max-w-xs">
        Upload your first image. Each upload automatically generates thumbnail, medium, and original versions.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <Upload className="w-4 h-4" /> Upload First Image
      </button>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

function getCategoryLabel(cat: string | null) {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat ?? 'Uncategorised';
}

// ── Upload progress state ─────────────────────────────────────────────────────

interface UploadStage {
  label: string;
  key: 'processing' | 'thumbnail' | 'medium' | 'original';
  pct: number;
  done: boolean;
}

// ── Edit form ─────────────────────────────────────────────────────────────────

interface EditForm {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
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

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState<EditForm>({ title: '', description: '', category: '', isPublic: true });
  const [uploadStages, setUploadStages] = useState<UploadStage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
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

  // ── Upload flow ───────────────────────────────────────────────────────────

  function initStages(): UploadStage[] {
    return [
      { label: 'Processing image', key: 'processing', pct: 0, done: false },
      { label: 'Thumbnail (low)',   key: 'thumbnail',  pct: 0, done: false },
      { label: 'Medium quality',    key: 'medium',     pct: 0, done: false },
      { label: 'Original (full)',   key: 'original',   pct: 0, done: false },
    ];
  }

  function setStage(key: UploadStage['key'], update: Partial<UploadStage>) {
    setUploadStages((prev) => prev.map((s) => (s.key === key ? { ...s, ...update } : s)));
  }

  function handleFilePick(file: File) {
    if (!file.type.startsWith('image/')) { error('Only image files are supported.'); return; }
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(url);
    setUploadStages(initStages());
    setUploadDone(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFilePick(file);
  }

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadStages(initStages());

    try {
      // Stage 1: process
      setStage('processing', { pct: 30 });
      const versions = await generateImageVersions(uploadFile);
      setStage('processing', { pct: 100, done: true });

      // Stage 2-4: upload sequentially (avoids ECONNRESET from concurrent large multipart uploads)
      const keys = await uploadGalleryVersions({
        versions,
        onProgress: (stage, pct) => setStage(stage, { pct }),
        onStageDone: (stage) => setStage(stage, { pct: 100, done: true }),
      });

      // Save record
      const created = await galleryApi.create({
        fileKey: keys.fileKey,
        thumbnailKey: keys.thumbnailKey,
        mediumKey: keys.mediumKey,
        fileType: 'image',
        title: uploadForm.title.trim() || null as unknown as string,
        description: uploadForm.description.trim() || null as unknown as string,
        category: uploadForm.category || null as unknown as string,
        isPublic: uploadForm.isPublic,
      });

      setItems((prev) => [created, ...prev]);
      setUploadDone(true);
      success('Image uploaded successfully in 3 quality versions!');
    } catch {
      error('Upload failed. Please try again.');
      setUploading(false);
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadForm, success, error]);

  function resetUpload() {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadStages([]);
    setUploadDone(false);
    setUploadForm({ title: '', description: '', category: '', isPublic: true });
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
    } catch {
      error('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [editItem, editForm, success, error]);

  // ── Visibility toggle (inline, no modal) ──────────────────────────────────

  const toggleVisibility = useCallback(async (item: GalleryItem) => {
    try {
      const updated = await galleryApi.update(item.id, { isPublic: !item.isPublic });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      error('Failed to update visibility.');
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
    } catch {
      error('Failed to delete image.');
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
            <Upload className="w-4 h-4" /> Upload Image
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

      {/* ── Upload modal overlay ── */}
      {uploadOpen && (
        <UploadModal
          dragOver={dragOver}
          setDragOver={setDragOver}
          uploadFile={uploadFile}
          uploadPreview={uploadPreview}
          uploadForm={uploadForm}
          setUploadForm={setUploadForm}
          uploadStages={uploadStages}
          uploading={uploading}
          uploadDone={uploadDone}
          fileInputRef={fileInputRef}
          onFilePick={handleFilePick}
          onUpload={handleUpload}
          onDrop={handleDrop}
          onReset={resetUpload}
          onClose={closeUpload}
        />
      )}

      {/* ── Edit modal ── */}
      {editItem && (
        <EditModal
          item={editItem}
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
        />
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
        <PreviewModal
          items={filtered}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNav={setPreviewIndex}
        />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 select-none">
        {index + 1} / {items.length}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors backdrop-blur-sm border border-white/10"
        title="Close (Esc)"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Prev arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        disabled={!hasPrev}
        className={`absolute left-3 sm:left-6 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border ${
          hasPrev
            ? 'bg-white/10 hover:bg-white/25 border-white/20 cursor-pointer'
            : 'bg-white/5 border-white/10 opacity-30 cursor-not-allowed'
        }`}
        title="Previous (←)"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Image container */}
      <div
        className="relative flex items-center justify-center max-w-[90vw] max-h-[85vh] px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.title ?? ''}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
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
        className={`absolute right-3 sm:right-6 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border ${
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[min(600px,90vw)] overflow-x-auto px-2 py-1 rounded-xl bg-black/40 backdrop-blur-sm">
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
  uploadFile: File | null;
  uploadPreview: string | null;
  uploadForm: EditForm;
  setUploadForm: (f: EditForm) => void;
  uploadStages: UploadStage[];
  uploading: boolean;
  uploadDone: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFilePick: (f: File) => void;
  onUpload: () => void;
  onDrop: (e: React.DragEvent) => void;
  onReset: () => void;
  onClose: () => void;
}

function UploadModal(props: UploadModalProps) {
  const {
    dragOver, setDragOver, uploadFile, uploadPreview, uploadForm, setUploadForm,
    uploadStages, uploading, uploadDone, fileInputRef, onFilePick, onUpload,
    onDrop, onReset, onClose,
  } = props;

  const anyProgress = uploadStages.some((s) => s.pct > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
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
              <h2 className="text-base font-bold text-gray-900">Upload Image</h2>
              <p className="text-[11px] text-gray-400">3 quality versions generated automatically</p>
            </div>
          </div>
          {!uploading && (
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {uploadDone ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 animate-scale-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Upload complete!</h3>
              <p className="text-sm text-gray-400 mb-6">Thumbnail, medium & original versions saved.</p>
              <div className="flex gap-3">
                <button type="button" onClick={onReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Upload Another
                </button>
                <button type="button" onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Drop zone ── */}
              {!uploadFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-12 ${
                    dragOver
                      ? 'border-rmc-green bg-rmc-green/5 scale-[1.01]'
                      : 'border-gray-200 bg-gray-50/50 hover:border-rmc-green/40 hover:bg-rmc-green/3'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${dragOver ? 'bg-rmc-green/15' : 'bg-gray-100'}`}>
                    <Upload className={`w-7 h-7 transition-colors duration-200 ${dragOver ? 'text-rmc-green' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP — max 10 MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFilePick(f); }}
                  />
                </div>
              ) : (
                /* ── File selected: preview + form ── */
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                    {uploadPreview && (
                      <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <p className="text-white text-xs font-semibold truncate">{uploadFile.name}</p>
                        <p className="text-white/70 text-[10px]">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      {!uploading && (
                        <button type="button" onClick={onReset}
                          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Version badges */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      {(['T', 'M', 'O'] as const).map((v) => (
                        <span key={v} className="w-6 h-6 rounded-full bg-rmc-green/80 backdrop-blur-sm text-white text-[9px] font-bold flex items-center justify-center border border-white/30">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Upload progress */}
                  {anyProgress && (
                    <div className="space-y-2 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-rmc-green" />
                        Generating & uploading versions…
                      </p>
                      {uploadStages.map((stage) => (
                        <ProgressRow key={stage.key} stage={stage} />
                      ))}
                    </div>
                  )}

                  {/* Metadata form */}
                  {!uploading && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="text"
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          placeholder="e.g. Eid Celebration 2025"
                          className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea
                          rows={2}
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          placeholder="Brief description of this image…"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 transition-all resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Category</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setUploadForm({ ...uploadForm, category: '' })}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                              !uploadForm.category ? 'bg-gray-700 text-white border-transparent' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            None
                          </button>
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setUploadForm({ ...uploadForm, category: cat.id })}
                              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                                uploadForm.category === cat.id ? cat.color : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                              }`}
                            >
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
                        <ToggleSwitch
                          checked={uploadForm.isPublic}
                          onChange={(v) => setUploadForm({ ...uploadForm, isPublic: v })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Footer actions ── */}
              {uploadFile && !uploadDone && (
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} disabled={uploading}
                    className="flex-1 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onUpload}
                    disabled={uploading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload in 3 Versions</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progress row ──────────────────────────────────────────────────────────────

function ProgressRow({ stage }: { stage: UploadStage }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
          {stage.done ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          ) : stage.pct > 0 ? (
            <Loader2 className="w-3 h-3 text-rmc-green animate-spin" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-gray-300" />
          )}
          {stage.label}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">{stage.pct}%</span>
      </div>
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${stage.done ? 'bg-emerald-500' : 'bg-rmc-green'}`}
          style={{ width: `${stage.pct}%` }}
        />
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
  const imgSrc = item.thumbnailKey ? fileUrl(item.thumbnailKey) : item.fileKey ? fileUrl(item.fileKey) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="h-1 bg-gradient-to-r from-rmc-green to-rmc-green-light" />

        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-rmc-green" /> Edit Image
          </h2>
          {!saving && (
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Thumbnail preview */}
          {imgSrc && (
            <div className="relative h-32 rounded-2xl overflow-hidden bg-gray-100">
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
          )}

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
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="No description"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/25 focus:border-rmc-green/40 transition-all resize-none"
            />
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

'use client';

/**
 * In-context editable gallery board — shown IN PLACE of the public gallery view
 * when a super-admin is in Edit Mode (see `GallerySwitch`). It presents the
 * gallery the way a standard gallery CMS does:
 *
 *   • category filter tabs with live counts (All + the fixed categories),
 *   • a responsive grid whose first cell is a big "＋ Add" tile,
 *   • a prominent single "＋" empty state when there are no photos,
 *   • per-photo hover controls (toggle public/private, delete),
 *   • a compact multi-image uploader (same pipeline as the admin Gallery Manager:
 *     generateImageVersions → uploadGalleryVersions → galleryApi.create).
 *
 * It fetches its own data via `galleryApi.adminGetAll` (super-admin only, so it
 * can show + manage private images too) and keeps that list in sync locally, so
 * counts and the grid update the moment something is added, hidden or removed.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Upload, X, Loader2, CheckCircle2, ImageOff, Layers,
  Eye, EyeOff, Trash2, Images, Pencil,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  galleryApi,
  generateImageVersions,
  uploadGalleryVersions,
  type GalleryItem,
} from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';

// ── Categories (the fixed gallery taxonomy) ────────────────────────────────────

const CATEGORIES = [
  { id: 'events', label: 'Events' },
  { id: 'ceremonies', label: 'Ceremonies' },
  { id: 'community', label: 'Community' },
  { id: 'education', label: 'Education' },
  { id: 'charity', label: 'Charity' },
  { id: 'other', label: 'Other' },
] as const;

const KNOWN = new Set<string>(CATEGORIES.map((c) => c.id));

/** Bucket an item into one of the fixed categories; anything else → "other". */
function catOf(item: GalleryItem): string {
  return item.category && KNOWN.has(item.category) ? item.category : 'other';
}

function labelOf(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';
}

// ── Upload pipeline plumbing ───────────────────────────────────────────────────

const STAGE_BASE: Record<'thumbnail' | 'medium' | 'original', number> = {
  thumbnail: 10, medium: 40, original: 70,
};
const STAGE_SPAN = 30;

type QueueStatus = 'pending' | 'processing' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: QueueStatus;
  pct: number;
  error?: string;
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ── Board ──────────────────────────────────────────────────────────────────────

export function GalleryEditBoard() {
  const { success, error } = useToast();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload modal
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await galleryApi.adminGetAll(undefined, 1);
      setItems(res.data);
    } catch {
      error('Could not load the gallery.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  // ── Counts + filtered view ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const c of CATEGORIES) map[c.id] = 0;
    for (const it of items) map[catOf(it)] += 1;
    return map;
  }, [items]);

  const filtered = useMemo(
    () => (activeCat === 'all' ? items : items.filter((it) => catOf(it) === activeCat)),
    [items, activeCat],
  );

  // ── Upload flow ───────────────────────────────────────────────────────────
  const patch = useCallback((id: string, p: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...p } : q)));
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

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const it = prev.find((q) => q.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((q) => q.id !== id);
    });
  }, []);

  const resetQueue = useCallback(() => {
    setQueue((prev) => { prev.forEach((q) => URL.revokeObjectURL(q.preview)); return []; });
  }, []);

  const openUpload = useCallback((presetCat?: string) => {
    setCategory(presetCat && KNOWN.has(presetCat) ? presetCat : '');
    setIsPublic(true);
    setOpen(true);
  }, []);

  const closeUpload = useCallback(() => {
    if (uploading) return;
    resetQueue();
    setOpen(false);
  }, [uploading, resetQueue]);

  const handleUpload = useCallback(async () => {
    const pending = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    if (!pending.length) return;
    setUploading(true);
    const created: GalleryItem[] = [];
    let ok = 0;
    let failed = 0;

    for (const q of pending) {
      try {
        patch(q.id, { status: 'processing', pct: 5, error: undefined });
        const versions = await generateImageVersions(q.file);
        patch(q.id, { status: 'uploading', pct: STAGE_BASE.thumbnail });
        const keys = await uploadGalleryVersions({
          versions,
          onProgress: (stage, pct) =>
            patch(q.id, { pct: Math.round(STAGE_BASE[stage] + (STAGE_SPAN * pct) / 100) }),
        });
        const rec = await galleryApi.create({
          fileKey: keys.fileKey,
          thumbnailKey: keys.thumbnailKey,
          mediumKey: keys.mediumKey,
          fileType: 'image',
          category: category || (undefined as unknown as string),
          isPublic,
        });
        created.push(rec);
        patch(q.id, { status: 'done', pct: 100 });
        ok++;
      } catch {
        patch(q.id, { status: 'error', pct: 0, error: 'Upload failed' });
        failed++;
      }
    }

    if (created.length) setItems((prev) => [...created, ...prev]);
    setUploading(false);
    if (ok) success(`${ok} image${ok > 1 ? 's' : ''} added.`);
    if (failed) error(`${failed} upload${failed > 1 ? 's' : ''} failed. Retry the failed ones.`);
  }, [queue, category, isPublic, patch, success, error]);

  // ── Per-image actions ─────────────────────────────────────────────────────
  const toggleVisibility = useCallback(async (item: GalleryItem) => {
    try {
      const updated = await galleryApi.update(item.id, { isPublic: !item.isPublic });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      error('Could not update visibility.');
    }
  }, [error]);

  const setItemCategory = useCallback(async (item: GalleryItem, cat: string) => {
    try {
      const updated = await galleryApi.update(item.id, { category: cat || null });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      error('Could not update category.');
    }
  }, [error]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await galleryApi.delete(deleteId);
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
      success('Image deleted.');
    } catch {
      error('Could not delete the image.');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }, [deleteId, success, error]);

  const total = queue.length;
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'error').length;
  const allDone = total > 0 && doneCount === total;

  const isEmpty = !loading && items.length === 0;

  return (
    <section className="relative py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Editing banner */}
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-rmc-green/20 bg-rmc-green/5 px-4 py-2.5 text-sm text-rmc-green">
          <Pencil className="h-4 w-4" />
          <span className="font-semibold">Editing gallery</span>
          <span className="text-rmc-green/70">— add, organise and remove photos. Changes are live.</span>
        </div>

        {/* Category tabs with counts */}
        <div className="mb-6 flex flex-wrap gap-2">
          <CatTab label="All" count={counts.all} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
          {CATEGORIES.map((c) => (
            <CatTab
              key={c.id}
              label={c.label}
              count={counts[c.id] ?? 0}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <Loader2 className="mb-3 h-10 w-10 animate-spin" />
            <p className="text-sm">Loading gallery…</p>
          </div>
        ) : isEmpty ? (
          /* Big "＋" empty state */
          <button
            type="button"
            onClick={() => openUpload()}
            className="group flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-rmc-green/30 bg-rmc-green/[0.03] py-24 text-center transition-colors hover:border-rmc-green/60 hover:bg-rmc-green/[0.06]"
          >
            <span className="grid h-20 w-20 place-items-center rounded-full bg-rmc-green/10 text-rmc-green transition-transform group-hover:scale-105">
              <Plus className="h-10 w-10" />
            </span>
            <span>
              <span className="block text-lg font-bold text-gray-800">Add your first photos</span>
              <span className="mt-1 block text-sm text-gray-400">
                Drag & drop or browse. Each image is stored in three quality versions.
              </span>
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {/* Add tile — first cell */}
            <button
              type="button"
              onClick={() => openUpload(activeCat === 'all' ? undefined : activeCat)}
              className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rmc-green/30 bg-rmc-green/[0.03] text-rmc-green/70 transition-colors hover:border-rmc-green/60 hover:bg-rmc-green/[0.06] hover:text-rmc-green"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-rmc-green/10 transition-colors group-hover:bg-rmc-green/20">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold">
                Add{activeCat !== 'all' ? ` to ${labelOf(activeCat)}` : ' images'}
              </span>
            </button>

            {filtered.map((item) => (
              <BoardCard
                key={item.id}
                item={item}
                onToggleVisibility={() => toggleVisibility(item)}
                onDelete={() => setDeleteId(item.id)}
                onSetCategory={(cat) => setItemCategory(item, cat)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeUpload} />
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="h-1.5 bg-gradient-to-r from-rmc-green via-rmc-green-light to-rmc-green" />
              <div className="flex items-center justify-between px-6 pb-4 pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rmc-green/10">
                    <Images className="h-[18px] w-[18px] text-rmc-green" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Add gallery images</h2>
                    <p className="text-[11px] text-gray-400">
                      {total ? `${total} selected · 3 quality versions each` : 'Add multiple images at once'}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button type="button" onClick={closeUpload} className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="max-h-[80vh] space-y-4 overflow-y-auto px-6 pb-6">
                {/* Dropzone */}
                <div
                  onDragOver={(e) => { if (!uploading) { e.preventDefault(); setDragOver(true); } }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading) addFiles(Array.from(e.dataTransfer.files)); }}
                  onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-7 transition-all ${
                    uploading ? 'cursor-not-allowed border-gray-200 bg-gray-50/50 opacity-60'
                      : dragOver ? 'cursor-pointer border-rmc-green bg-rmc-green/5'
                      : 'cursor-pointer border-gray-200 bg-gray-50/50 hover:border-rmc-green/40'
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dragOver ? 'bg-rmc-green/15' : 'bg-gray-100'}`}>
                    <Upload className={`h-5 w-5 ${dragOver ? 'text-rmc-green' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {dragOver ? 'Drop to add' : total ? 'Add more images' : 'Drag & drop or click to browse'}
                  </p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP — max 10 MB each</p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only"
                    onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; if (files.length) addFiles(files); e.target.value = ''; }} />
                </div>

                {/* Queue */}
                {total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <Layers className="h-3.5 w-3.5 text-rmc-green" />
                        {total} image{total > 1 ? 's' : ''}
                        {doneCount > 0 && <span className="font-medium text-emerald-600"> · {doneCount} done</span>}
                      </p>
                      {!uploading && (
                        <button type="button" onClick={resetQueue} className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-red-500">Clear all</button>
                      )}
                    </div>
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {queue.map((q) => (
                        <div key={q.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={q.preview} alt="" className="h-full w-full object-cover" />
                            {q.status === 'done' && <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/70"><CheckCircle2 className="h-5 w-5 text-white" /></div>}
                            {q.status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-red-500/70"><ImageOff className="h-5 w-5 text-white" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-gray-800">{q.file.name}</p>
                            <p className="text-[10px] text-gray-400">{(q.file.size / 1024 / 1024).toFixed(1)} MB</p>
                            {(q.status === 'processing' || q.status === 'uploading') && (
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200">
                                <div className="h-full rounded-full bg-rmc-green transition-all duration-300" style={{ width: `${q.pct}%` }} />
                              </div>
                            )}
                            {q.status === 'error' && <p className="mt-0.5 text-[10px] font-medium text-red-500">{q.error}</p>}
                          </div>
                          <div className="flex w-7 shrink-0 items-center justify-center">
                            {q.status === 'processing' || q.status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-rmc-green" />
                              : q.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : !uploading ? (
                                <button type="button" onClick={() => removeFromQueue(q.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                              ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {total > 0 && !allDone && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-700">Category <span className="font-normal text-gray-400">(applied to all)</span></label>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={uploading} onClick={() => setCategory('')}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${!category ? 'border-transparent bg-gray-700 text-white' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>None</button>
                        {CATEGORIES.map((c) => (
                          <button key={c.id} type="button" disabled={uploading} onClick={() => setCategory(c.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${category === c.id ? 'border-transparent bg-rmc-green text-white' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{c.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Public</p>
                        <p className="text-[11px] text-gray-400">Visible on this gallery page</p>
                      </div>
                      <button type="button" onClick={() => setIsPublic((v) => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? 'bg-rmc-green' : 'bg-gray-300'}`}>
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                {total > 0 && (
                  <div className="flex gap-3 pt-1">
                    {allDone ? (
                      <>
                        <button type="button" onClick={resetQueue} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rmc-green py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"><Plus className="h-4 w-4" /> Add more</button>
                        <button type="button" onClick={closeUpload} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">Done</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={closeUpload} disabled={uploading} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40">Cancel</button>
                        <button type="button" onClick={handleUpload} disabled={uploading || pendingCount === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rmc-green py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
                          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload {pendingCount} image{pendingCount > 1 ? 's' : ''}</>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete image?"
        description="This permanently removes the image and all quality versions from the gallery."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={deleting}
      />
    </section>
  );
}

// ── Category tab ────────────────────────────────────────────────────────────────

function CatTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
        active ? 'bg-rmc-green text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}

// ── Board card ──────────────────────────────────────────────────────────────────

function BoardCard({
  item,
  onToggleVisibility,
  onDelete,
  onSetCategory,
}: {
  item: GalleryItem;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onSetCategory: (cat: string) => void;
}) {
  const src = item.thumbnailKey ? fileUrl(item.thumbnailKey) : item.fileKey ? fileUrl(item.fileKey) : null;
  const [imgError, setImgError] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-sm">
      {src && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={item.title ?? ''} onError={() => setImgError(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><ImageOff className="h-8 w-8 text-gray-300" /></div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Category badge + private marker */}
      <div className="pointer-events-none absolute left-2 right-2 top-2 flex items-start justify-between">
        <span className="rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
          {labelOf(catOf(item))}
        </span>
        {!item.isPublic && (
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-sm">
            <EyeOff className="h-2.5 w-2.5" /> Hidden
          </span>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button type="button" onClick={() => setCatOpen((v) => !v)} title="Change category"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onToggleVisibility} title={item.isPublic ? 'Make hidden' : 'Make public'}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-md transition-colors ${item.isPublic ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
          {item.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onDelete} title="Delete"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-md transition-colors hover:bg-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      {/* Category quick-picker */}
      {catOpen && (
        <div className="absolute inset-x-2 bottom-11 z-10 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button"
                onClick={() => { onSetCategory(c.id); setCatOpen(false); }}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold transition-colors ${catOf(item) === c.id ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

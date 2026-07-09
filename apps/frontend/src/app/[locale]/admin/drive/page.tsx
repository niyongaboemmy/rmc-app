'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, ChevronRight, Home, RefreshCw, Grid3X3, List,
  HardDrive, Upload, FolderPlus, Download, Trash2, Share2,
  Move, Copy, Eye, MoreHorizontal, FileText, Archive,
  FolderOpen, ChevronDown, Info,
} from 'lucide-react';
import {
  DriveItem, adminListAll, adminListUserFiles,
  updateItem, trashItem, permanentDelete, getFileUrl, getZipDownloadUrl,
  formatBytes, moveItem, copyItem, restoreItem, createFolder,
} from '@/lib/driveApi';
import { DriveGrid } from '@/components/drive/DriveGrid';
import { FilePreview } from '@/components/drive/FilePreview';
import { ShareModal } from '@/components/drive/ShareModal';
import { MoveModal } from '@/components/drive/MoveModal';
import { UploadZone, type UploadZoneHandle } from '@/components/drive/UploadZone';
import { apiClient } from '@/lib/api';
import { ModalPortal } from '@/components/ui/Modal';

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhotoUrl: string | null;
}

export default function AdminDrivePage() {
  const [mode, setMode] = useState<'all' | 'user'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([]);

  // New folder
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Rename
  const [renaming, setRenaming] = useState<{ item: DriveItem; value: string } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Upload
  const uploadRef = useRef<UploadZoneHandle>(null);

  // Per-item action loading
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());
  const addLoading = (id: string) => setActionLoadingIds((prev) => new Set(prev).add(id));
  const removeLoading = (id: string) =>
    setActionLoadingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });

  // Overlays
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const [shareItem_, setShareItem] = useState<DriveItem | null>(null);
  const [moveState, setMoveState] = useState<{ item: DriveItem; mode: 'move' | 'copy' } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'all') {
        setItems(await adminListAll(currentFolderId));
      } else if (selectedUser) {
        setItems(await adminListUserFiles(selectedUser.id));
      } else {
        setItems([]);
      }
    } catch {}
    finally { setLoading(false); }
  }, [mode, currentFolderId, selectedUser]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // User search debounce
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get('/users', { params: { search: userSearch, limit: 10 } });
        setUserResults((res.data as any)?.data?.users ?? []);
      } catch { setUserResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    if (newFolderOpen) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [newFolderOpen]);

  const openFolder = (item: DriveItem) => {
    if (item.type !== 'folder') return;
    setCurrentFolderId(item.id);
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const navigateToCrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const goRoot = () => {
    setCurrentFolderId(undefined);
    setBreadcrumbs([]);
  };

  const selectUser = (user: UserResult) => {
    setSelectedUser(user);
    setMode('user');
    setUserSearch('');
    setUserResults([]);
  };

  const handleDownload = (item: DriveItem) => {
    if (!item.storageKey) return;
    const a = document.createElement('a');
    a.href = getFileUrl(item.storageKey);
    a.download = item.name;
    a.click();
  };

  const handleDownloadZip = (item: DriveItem) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : '';
    addLoading(item.id);
    fetch(getZipDownloadUrl(item.id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${item.name}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .finally(() => removeLoading(item.id));
  };

  const handleStar = async (item: DriveItem) => {
    addLoading(item.id);
    try { await updateItem(item.id, { isStarred: !item.isStarred }); loadItems(); } catch {}
    finally { removeLoading(item.id); }
  };
  const handleTrash = async (item: DriveItem) => {
    addLoading(item.id);
    try { await trashItem(item.id); loadItems(); } catch {}
    finally { removeLoading(item.id); }
  };
  const handleRestore = async (item: DriveItem) => {
    addLoading(item.id);
    try { await restoreItem(item.id); loadItems(); } catch {}
    finally { removeLoading(item.id); }
  };
  const handlePermanentDelete = async (item: DriveItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    addLoading(item.id);
    try { await permanentDelete(item.id); loadItems(); } catch {}
    finally { removeLoading(item.id); }
  };
  const handleMove = async (targetFolderId: string | null) => {
    if (!moveState) return;
    if (moveState.mode === 'move') await moveItem(moveState.item.id, targetFolderId);
    else await copyItem(moveState.item.id, targetFolderId);
    loadItems();
  };

  const startRename = (item: DriveItem) => {
    setRenaming({ item, value: item.name });
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const submitRename = async () => {
    if (!renaming || !renaming.value.trim()) { setRenaming(null); return; }
    addLoading(renaming.item.id);
    try {
      await updateItem(renaming.item.id, { name: renaming.value.trim() });
      loadItems();
    } catch {}
    finally {
      removeLoading(renaming.item.id);
      setRenaming(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setNewFolderLoading(true);
    try {
      await createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderOpen(false);
      setNewFolderName('');
      loadItems();
    } catch {}
    finally { setNewFolderLoading(false); }
  };

  const totalSize = items.filter((i) => i.type === 'file').reduce((a, i) => a + (i.size ?? 0), 0);
  const folderCount = items.filter((i) => i.type === 'folder').length;
  const fileCount = items.filter((i) => i.type === 'file').length;

  return (
    <div className="space-y-0 -m-4 sm:-m-5 min-h-screen bg-gray-50/40">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-rmc-green" />
              Drive — Admin View
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Browse, manage and upload files across the platform</p>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setMode('all'); setSelectedUser(null); goRoot(); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'all'
                  ? 'bg-white text-rmc-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <HardDrive className="w-4 h-4" /> All files
            </button>
            <button
              onClick={() => setMode('user')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'user'
                  ? 'bg-white text-rmc-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" /> By user
            </button>
          </div>
        </div>

        {/* ── Action toolbar ───────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* New dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rmc-green text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-rmc-green/90 transition-all">
              <FolderPlus className="w-3.5 h-3.5" />
              New
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 w-48 hidden group-hover:block group-focus-within:block">
              <button
                onClick={() => setNewFolderOpen(true)}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-50 text-xs text-gray-700 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                New folder
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => uploadRef.current?.trigger()}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-50 text-xs text-gray-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-rmc-green" />
                Upload files
              </button>
            </div>
          </div>

          <button
            onClick={() => uploadRef.current?.trigger()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:border-rmc-green hover:text-rmc-green hover:bg-rmc-green/5 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>

          <button
            onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Folder
          </button>

          <div className="h-5 w-px bg-gray-200 mx-0.5" />

          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadItems}
            title="Refresh"
            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>

          <div className="ml-auto hidden lg:flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs px-2.5 py-1.5 rounded-lg border border-blue-100">
            <Info className="w-3 h-3 shrink-0" />
            Drag &amp; drop to upload
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-4">

        {/* User search (mode = by user) */}
        {mode === 'user' && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user by name, email or phone…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green bg-white shadow-sm"
            />
            {userResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-1.5 overflow-hidden">
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-rmc-green/15 text-rmc-green text-sm font-bold flex items-center justify-center shrink-0">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-400">{user.email} · {user.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected user badge */}
        {mode === 'user' && selectedUser && (
          <div className="flex items-center gap-3 p-3 bg-white border border-rmc-green/20 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-full bg-rmc-green/15 text-rmc-green font-bold flex items-center justify-center text-sm">
              {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p className="text-xs text-gray-400">{selectedUser.email} · {selectedUser.phone}</p>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setItems([]); }}
              className="text-xs text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-gray-200"
            >
              Clear
            </button>
          </div>
        )}

        {/* Breadcrumb (all-files mode) */}
        {mode === 'all' && (
          <div className="flex items-center gap-1 text-sm bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <button onClick={goRoot} className="flex items-center gap-1.5 text-gray-500 hover:text-rmc-green transition-colors font-medium">
              <Home className="w-3.5 h-3.5" /> All files
            </button>
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <button
                  onClick={() => navigateToCrumb(i)}
                  className="text-gray-600 hover:text-rmc-green transition-colors font-medium truncate max-w-40"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        {items.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{folderCount > 0 ? `${folderCount} folder${folderCount > 1 ? 's' : ''}` : ''}</span>
            <span>{fileCount > 0 ? `${fileCount} file${fileCount > 1 ? 's' : ''}` : ''}</span>
            {totalSize > 0 && <span>{formatBytes(totalSize)} total</span>}
          </div>
        )}

        {/* ── Main content with drag & drop ────────────────────────────── */}
        <UploadZone
          ref={uploadRef}
          parentId={currentFolderId}
          onUploaded={loadItems}
          fullArea
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-rmc-green border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Loading files…</p>
            </div>
          ) : items.length === 0 && !loading ? (
            <EmptyState
              mode={mode}
              hasUser={!!selectedUser}
              onUpload={() => uploadRef.current?.trigger()}
              onNewFolder={() => setNewFolderOpen(true)}
            />
          ) : (
            <DriveGrid
              items={items}
              viewMode={viewMode}
              loadingItemIds={actionLoadingIds}
              onOpen={openFolder}
              onPreview={setPreview}
              onRename={startRename}
              onMove={(item) => setMoveState({ item, mode: 'move' })}
              onCopy={(item) => setMoveState({ item, mode: 'copy' })}
              onShare={setShareItem}
              onStar={handleStar}
              onTrash={handleTrash}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              onDownload={handleDownload}
              onDownloadZip={handleDownloadZip}
            />
          )}
        </UploadZone>
      </div>

      {/* ── New Folder modal ─────────────────────────────────────────────── */}
      <ModalPortal>
      {newFolderOpen && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-400" /> New folder
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Will be created in {breadcrumbs.length > 0 ? `"${breadcrumbs[breadcrumbs.length - 1].name}"` : 'root'}
            </p>
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setNewFolderOpen(false); setNewFolderName(''); }
              }}
              placeholder="Untitled folder"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || newFolderLoading}
                className="px-4 py-2 text-sm bg-rmc-green text-white rounded-xl hover:bg-rmc-green/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {newFolderLoading
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  : <><FolderPlus className="w-3.5 h-3.5" /> Create</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      </ModalPortal>

      {/* Rename modal */}
      <ModalPortal>
        {renaming && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setRenaming(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Rename</h3>
              <input
                ref={renameInputRef}
                type="text"
                value={renaming.value}
                onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(null); }}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setRenaming(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={submitRename} className="px-4 py-2 text-sm bg-rmc-green text-white rounded-lg hover:bg-rmc-green/90">Rename</button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Modals */}
      {preview && <FilePreview item={preview} onClose={() => setPreview(null)} />}
      {shareItem_ && <ShareModal item={shareItem_} onClose={() => { setShareItem(null); loadItems(); }} />}
      {moveState && (
        <MoveModal
          item={moveState.item}
          mode={moveState.mode}
          onClose={() => setMoveState(null)}
          onConfirm={handleMove}
        />
      )}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({
  mode, hasUser, onUpload, onNewFolder,
}: {
  mode: 'all' | 'user';
  hasUser: boolean;
  onUpload: () => void;
  onNewFolder: () => void;
}) {
  if (mode === 'user' && !hasUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <Users className="w-9 h-9 text-gray-300" />
        </div>
        <p className="text-base font-semibold text-gray-700 mb-1">Select a user</p>
        <p className="text-sm text-gray-400">Search for a user above to view their uploaded files</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Drop zone visual */}
      <div className="border-2 border-dashed border-gray-200 rounded-3xl px-12 py-10 mb-6 bg-white hover:border-rmc-green/40 hover:bg-rmc-green/3 transition-all cursor-pointer group" onClick={onUpload}>
        <div className="w-16 h-16 bg-gray-50 group-hover:bg-rmc-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
          <Upload className="w-8 h-8 text-gray-300 group-hover:text-rmc-green transition-colors" />
        </div>
        <p className="text-base font-semibold text-gray-700 mb-1">Drag files here or click to upload</p>
        <p className="text-sm text-gray-400">Supports any file type — PDF, images, videos, documents, ZIP…</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
        <ActionCard
          icon={<Upload className="w-5 h-5 text-rmc-green" />}
          bg="bg-rmc-green/8"
          title="Upload files"
          desc="Any file type, any size"
          onClick={onUpload}
        />
        <ActionCard
          icon={<FolderPlus className="w-5 h-5 text-blue-500" />}
          bg="bg-blue-50"
          title="New folder"
          desc="Organise your files"
          onClick={onNewFolder}
        />
        <ActionCard
          icon={<FileText className="w-5 h-5 text-purple-500" />}
          bg="bg-purple-50"
          title="Drag & drop"
          desc="Drop files anywhere on the page"
          onClick={onUpload}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon, bg, title, desc, onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-md transition-all text-center"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </button>
  );
}

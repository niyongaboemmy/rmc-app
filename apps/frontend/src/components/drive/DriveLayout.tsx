'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { UploadZoneHandle } from './UploadZone';
import {
  Search, Grid3X3, List, Plus, Upload, FolderPlus,
  HardDrive, Share2, Star, Trash2, Clock, ChevronRight,
  Home, X, RefreshCw, Users,
} from 'lucide-react';
import { ModalPortal } from '@/components/ui/Modal';
import {
  DriveItem, Breadcrumb,
  listItems, listSharedWithMe, listStarred, listTrash,
  searchItems, getStorageStats, getBreadcrumb,
  createFolder, moveItem, copyItem, trashItem, restoreItem,
  permanentDelete, updateItem, getFileUrl, getZipDownloadUrl, formatBytes,
} from '@/lib/driveApi';
import { DriveGrid } from './DriveGrid';
import { UploadZone } from './UploadZone';
import { FilePreview } from './FilePreview';
import { ShareModal } from './ShareModal';
import { MoveModal } from './MoveModal';

type Section = 'my-drive' | 'shared' | 'starred' | 'trash' | 'recent';
type DriveFilter = 'all' | 'mine' | 'shared';

interface RenameState { item: DriveItem; value: string }

interface DriveLayoutProps {
  isAdmin?: boolean;
  adminUserId?: string;
  title?: string;
}

export function DriveLayout({ isAdmin = false, title }: DriveLayoutProps) {
  const [section, setSection] = useState<Section>('my-drive');
  const [driveFilter, setDriveFilter] = useState<DriveFilter>('all');
  const [items, setItems] = useState<DriveItem[]>([]);
  const [sharedItems, setSharedItems] = useState<DriveItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DriveItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ usedBytes: number; totalFiles: number } | null>(null);
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());

  // Modals / overlays
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const [shareItem_, setShareItem] = useState<DriveItem | null>(null);
  const [moveState, setMoveState] = useState<{ item: DriveItem; mode: 'move' | 'copy' } | null>(null);
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<UploadZoneHandle>(null);

  const addLoading = (id: string) => setActionLoadingIds((prev) => new Set(prev).add(id));
  const removeLoading = (id: string) =>
    setActionLoadingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let data: DriveItem[] = [];
      let shared: DriveItem[] = [];
      if (section === 'my-drive') {
        [data, shared] = await Promise.all([
          listItems(currentFolderId, false),
          currentFolderId ? Promise.resolve([]) : listSharedWithMe(),
        ]);
        setSharedItems(shared);
      } else if (section === 'shared') {
        data = await listSharedWithMe();
      } else if (section === 'starred') {
        data = await listStarred();
      } else if (section === 'trash') {
        data = await listTrash();
      } else if (section === 'recent') {
        const all = await listItems(undefined, false);
        data = [...all].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 30);
      }
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  }, [section, currentFolderId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    getStorageStats().then(setStats).catch(() => {});
  }, [items]);

  useEffect(() => {
    if (!currentFolderId) { setBreadcrumbs([]); return; }
    getBreadcrumb(currentFolderId).then(setBreadcrumbs).catch(() => setBreadcrumbs([]));
  }, [currentFolderId]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchItems(searchQuery);
        setSearchResults(results);
      } catch { setSearchResults([]); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openFolder = (item: DriveItem) => {
    if (item.type !== 'folder') return;
    setCurrentFolderId(item.id);
    setSection('my-drive');
    setSearchResults(null);
    setSearchQuery('');
    setDriveFilter('all');
  };

  const navigateToCrumb = (folderId?: string) => {
    setCurrentFolderId(folderId);
    setSearchResults(null);
  };

  const handleStar = async (item: DriveItem) => {
    addLoading(item.id);
    try {
      await updateItem(item.id, { isStarred: !item.isStarred });
      loadItems();
    } catch {}
    finally { removeLoading(item.id); }
  };

  const handleTrash = async (item: DriveItem) => {
    addLoading(item.id);
    try {
      await trashItem(item.id);
      loadItems();
    } catch {}
    finally { removeLoading(item.id); }
  };

  const handleRestore = async (item: DriveItem) => {
    addLoading(item.id);
    try {
      await restoreItem(item.id);
      loadItems();
    } catch {}
    finally { removeLoading(item.id); }
  };

  const handlePermanentDelete = async (item: DriveItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    addLoading(item.id);
    try {
      await permanentDelete(item.id);
      loadItems();
    } catch {}
    finally { removeLoading(item.id); }
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
    const url = getZipDownloadUrl(item.id);
    addLoading(item.id);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${item.name}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {})
      .finally(() => removeLoading(item.id));
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (!moveState) return;
    if (moveState.mode === 'move') {
      await moveItem(moveState.item.id, targetFolderId);
    } else {
      await copyItem(moveState.item.id, targetFolderId);
    }
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

  useEffect(() => {
    if (newFolderOpen) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [newFolderOpen]);

  // Compute displayed items based on filter
  const displayedItems = (() => {
    if (searchResults) return searchResults;
    if (section === 'my-drive' && !currentFolderId) {
      if (driveFilter === 'mine') return items;
      if (driveFilter === 'shared') return sharedItems;
      return [...items, ...sharedItems];
    }
    return items;
  })();

  const showFilterTabs = section === 'my-drive' && !currentFolderId && !searchResults;

  return (
    <div className="flex h-full min-h-0 bg-white">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 border-r border-gray-100 py-3 shrink-0 bg-gray-50/50">
        {/* New button */}
        <div className="px-3 mb-3">
          <div className="relative">
            <button
              onClick={() => {
                const menu = document.getElementById('new-menu');
                if (menu) menu.classList.toggle('hidden');
              }}
              className="flex items-center gap-1.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all text-xs font-medium text-gray-700"
            >
              <Plus className="w-3.5 h-3.5 text-rmc-green" />
              New
            </button>
            <div id="new-menu" className="hidden absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setNewFolderOpen(true); document.getElementById('new-menu')?.classList.add('hidden'); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-50 text-xs text-gray-700"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-400" /> New folder
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  document.getElementById('new-menu')?.classList.add('hidden');
                  uploadRef.current?.trigger();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-50 text-xs text-gray-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-rmc-green" /> Upload files
              </button>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5">
          {[
            { key: 'my-drive', icon: HardDrive, label: 'My Drive' },
            { key: 'recent', icon: Clock, label: 'Recent' },
            { key: 'starred', icon: Star, label: 'Starred' },
            { key: 'shared', icon: Share2, label: 'Shared with me' },
            { key: 'trash', icon: Trash2, label: 'Trash' },
          ].map((nav) => (
            <button
              key={nav.key}
              onClick={() => {
                setSection(nav.key as Section);
                setCurrentFolderId(undefined);
                setSearchResults(null);
                setSearchQuery('');
                setDriveFilter('all');
              }}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs transition-colors
                ${section === nav.key && !searchResults
                  ? 'bg-rmc-green/10 text-rmc-green font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <nav.icon className="w-3.5 h-3.5 shrink-0" />
              {nav.label}
            </button>
          ))}
        </nav>

        {/* Storage usage */}
        {stats && (
          <div className="px-3 mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 mb-1">Storage</p>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-rmc-green rounded-full"
                style={{ width: `${Math.min((stats.usedBytes / (1024 * 1024 * 1024)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {formatBytes(stats.usedBytes)} used · {stats.totalFiles} files
            </p>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* View mode */}
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <List className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          <button onClick={loadItems} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors shrink-0" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Mobile section nav */}
        {!searchResults && (
          <div className="lg:hidden flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 overflow-x-auto scrollbar-hide shrink-0">
            {[
              { key: 'my-drive', icon: HardDrive, label: 'My Drive' },
              { key: 'recent', icon: Clock, label: 'Recent' },
              { key: 'starred', icon: Star, label: 'Starred' },
              { key: 'shared', icon: Share2, label: 'Shared' },
              { key: 'trash', icon: Trash2, label: 'Trash' },
            ].map((nav) => (
              <button
                key={nav.key}
                onClick={() => {
                  setSection(nav.key as Section);
                  setCurrentFolderId(undefined);
                  setSearchResults(null);
                  setSearchQuery('');
                  setDriveFilter('all');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  section === nav.key
                    ? 'bg-rmc-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <nav.icon className="w-3 h-3" />
                {nav.label}
              </button>
            ))}
            <div className="ml-auto shrink-0 flex items-center gap-1">
              <button
                onClick={() => setNewFolderOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                <FolderPlus className="w-3 h-3" /> Folder
              </button>
              <button
                onClick={() => uploadRef.current?.trigger()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rmc-green/10 text-rmc-green hover:bg-rmc-green/20 transition-colors whitespace-nowrap"
              >
                <Upload className="w-3 h-3" /> Upload
              </button>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        {section === 'my-drive' && !searchResults && (
          <div className="flex items-center gap-1 px-3 py-1.5 text-xs border-b border-gray-50">
            <button
              onClick={() => navigateToCrumb(undefined)}
              className="flex items-center gap-1 hover:text-rmc-green transition-colors text-gray-500 font-medium"
            >
              <Home className="w-3 h-3" /> My Drive
            </button>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <button
                  onClick={() => navigateToCrumb(crumb.id)}
                  className="hover:text-rmc-green transition-colors text-gray-600 font-medium truncate max-w-28"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Section heading + filter tabs */}
        <div className="px-3 pt-2.5 pb-1.5 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">
            {searchResults ? `Results for "${searchQuery}"` : {
              'my-drive': currentFolderId ? (breadcrumbs[breadcrumbs.length - 1]?.name ?? 'My Drive') : (title ?? 'My Drive'),
              'shared': 'Shared with me',
              'starred': 'Starred',
              'trash': 'Trash',
              'recent': 'Recent',
            }[section]}
          </h2>
          {searchResults && (
            <p className="text-[11px] text-gray-400 mt-0.5">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
          )}

          {/* Filter tabs — only on My Drive root */}
          {showFilterTabs && (
            <div className="flex items-center gap-1 mt-2">
              {(
              [
                { key: 'all' as DriveFilter, label: 'All', icon: null },
                { key: 'mine' as DriveFilter, label: 'My files', icon: null },
                { key: 'shared' as DriveFilter, label: 'Shared with me', icon: Users },
              ] as { key: DriveFilter; label: string; icon: React.ElementType | null }[]
            ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDriveFilter(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    driveFilter === f.key
                      ? 'bg-rmc-green text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.icon && <f.icon className="w-2.5 h-2.5" />}
                  {f.label}
                  {f.key === 'shared' && sharedItems.length > 0 && (
                    <span className={`ml-0.5 text-[10px] px-1 rounded-full ${driveFilter === 'shared' ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {sharedItems.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <UploadZone ref={uploadRef} parentId={currentFolderId} onUploaded={loadItems} fullArea>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <DriveGrid
                items={displayedItems}
                viewMode={viewMode}
                isTrash={section === 'trash'}
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
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <ModalPortal>
        {newFolderOpen && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-400" /> New folder
              </h3>
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderOpen(false); }}
                placeholder="Untitled folder"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || newFolderLoading}
                  className="px-4 py-2 text-sm bg-rmc-green text-white rounded-lg hover:bg-rmc-green/90 disabled:opacity-50"
                >
                  {newFolderLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

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

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Shield, Calendar, HardDrive,
  User, FileText, Grid3X3, List, RefreshCw, Home, ChevronRight,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission, hasPermission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  adminListAll, adminListUserFiles, adminListSharedWithUser,
  DriveItem, formatBytes, getFileUrl, getZipDownloadUrl,
} from '@/lib/driveApi';
import { DriveGrid } from '@/components/drive/DriveGrid';
import { FilePreview } from '@/components/drive/FilePreview';
import { StatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profilePhotoUrl: string | null;
  roleEntity: { id: string; name: string; slug: string } | null;
}

interface Crumb { id?: string; name: string }

type Tab = 'info' | 'drive';

export default function AdminUserDetailPage() {
  return (
    <ProtectedRoute permissions={[Permission.USERS_VIEW]}>
      <UserDetailContent />
    </ProtectedRoute>
  );
}

function UserDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const permissions = (authUser as any)?.permissions ?? [];
  const canViewDrive = hasPermission(permissions, Permission.USERS_VIEW_DRIVE);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');

  // Drive state
  const [driveFilter, setDriveFilter] = useState<'mine' | 'shared'>('mine');
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [sharedCount, setSharedCount] = useState(0);
  const [driveLoading, setDriveLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([]);
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());

  const addLoading = (itemId: string) =>
    setActionLoadingIds((prev) => new Set(prev).add(itemId));
  const removeLoading = (itemId: string) =>
    setActionLoadingIds((prev) => { const s = new Set(prev); s.delete(itemId); return s; });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get(`/users/${id}`)
      .then((res) => setUser((res.data as any)?.data ?? (res.data as any)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [id]);

  const loadDrive = useCallback(async () => {
    if (!id || !canViewDrive) return;
    setDriveLoading(true);
    try {
      let items: DriveItem[];
      if (driveFilter === 'shared') {
        items = await adminListSharedWithUser(id);
      } else if (currentFolderId) {
        items = await adminListAll(currentFolderId);
      } else {
        const [owned, shared] = await Promise.all([
          adminListUserFiles(id),
          adminListSharedWithUser(id),
        ]);
        setSharedCount(shared.length);
        items = owned;
      }
      setDriveItems(items);
    } catch {
      setDriveItems([]);
    } finally {
      setDriveLoading(false);
    }
  }, [id, canViewDrive, currentFolderId, driveFilter]);

  useEffect(() => {
    if (tab === 'drive') loadDrive();
  }, [tab, loadDrive]);

  const switchFilter = (f: 'mine' | 'shared') => {
    setDriveFilter(f);
    setCurrentFolderId(undefined);
    setBreadcrumbs([]);
  };

  const openFolder = (item: DriveItem) => {
    if (item.type !== 'folder') return;
    setCurrentFolderId(item.id);
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const navigateToCrumb = (index: number) => {
    if (index < 0) {
      setCurrentFolderId(undefined);
      setBreadcrumbs([]);
    } else {
      const crumb = breadcrumbs[index];
      setCurrentFolderId(crumb.id);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
    }
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
      .catch(() => {})
      .finally(() => removeLoading(item.id));
  };

  if (loading) return <PageSpinner />;
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <User className="w-12 h-12 mb-3" />
        <p>User not found</p>
      </div>
    );
  }

  const driveStats = {
    files: driveItems.filter((i) => i.type === 'file').length,
    folders: driveItems.filter((i) => i.type === 'folder').length,
    bytes: driveItems.filter((i) => i.type === 'file').reduce((a, i) => a + (i.size ?? 0), 0),
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; hidden?: boolean }[] = [
    { key: 'info', label: 'Info', icon: User },
    { key: 'drive', label: 'Drive Files', icon: HardDrive, hidden: !canViewDrive },
  ];

  return (
    <div className="space-y-4 -m-4 sm:-m-5 min-h-screen bg-gray-50/40">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-5 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rmc-green transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to users
        </button>

        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-rmc-green/15 text-rmc-green text-xl font-bold flex items-center justify-center shrink-0">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={user.status} />
              <span className="text-xs text-gray-400 capitalize">{user.role}</span>
              {user.roleEntity && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{user.roleEntity.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 border-b border-gray-100 -mb-px">
          {tabs.filter((t) => !t.hidden).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.key
                  ? 'border-rmc-green text-rmc-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5">
        {/* Info Tab */}
        {tab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Contact</h2>
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Phone" value={user.phone} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Account</h2>
              <InfoRow icon={Shield} label="System role" value={<span className="capitalize">{user.role}</span>} />
              {user.roleEntity && <InfoRow icon={Shield} label="Custom role" value={user.roleEntity.name} />}
              <InfoRow icon={Calendar} label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
              <InfoRow icon={Calendar} label="Last updated" value={new Date(user.updatedAt).toLocaleDateString()} />
            </div>
          </div>
        )}

        {/* Drive Tab */}
        {tab === 'drive' && canViewDrive && (
          <div className="space-y-3">
            {/* Filter tabs + toolbar row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter pills */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => switchFilter('mine')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    driveFilter === 'mine'
                      ? 'bg-rmc-green text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Their files
                </button>
                <button
                  onClick={() => switchFilter('shared')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    driveFilter === 'shared'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Shared with them
                  {sharedCount > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${driveFilter === 'shared' ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
                      {sharedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Breadcrumb — only in mine mode */}
              {driveFilter === 'mine' && (
                <div className="flex items-center gap-1 text-xs flex-1 min-w-0 overflow-x-auto">
                  <button
                    onClick={() => navigateToCrumb(-1)}
                    className="flex items-center gap-1 text-gray-500 hover:text-rmc-green transition-colors font-medium shrink-0"
                  >
                    <Home className="w-3 h-3" />
                    Root
                  </button>
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                      <button
                        onClick={() => navigateToCrumb(i)}
                        className={`hover:text-rmc-green transition-colors font-medium truncate max-w-32 ${
                          i === breadcrumbs.length - 1 ? 'text-gray-800' : 'text-gray-500'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                {/* Stats */}
                {!driveLoading && driveItems.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 mr-1">
                    {driveStats.folders > 0 && <span>{driveStats.folders} folder{driveStats.folders > 1 ? 's' : ''}</span>}
                    {driveStats.files > 0 && <span>{driveStats.files} file{driveStats.files > 1 ? 's' : ''}</span>}
                    {driveStats.bytes > 0 && <span>{formatBytes(driveStats.bytes)}</span>}
                  </div>
                )}

                {/* View mode */}
                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
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

                <button
                  onClick={loadDrive}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            {driveLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : driveItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">
                  {driveFilter === 'shared'
                    ? `No files have been shared with ${user.firstName}`
                    : currentFolderId
                      ? 'This folder is empty'
                      : `${user.firstName} hasn't uploaded any files`}
                </p>
                {currentFolderId && driveFilter === 'mine' && (
                  <button
                    onClick={() => navigateToCrumb(-1)}
                    className="mt-2 text-xs text-rmc-green hover:underline"
                  >
                    Back to root
                  </button>
                )}
              </div>
            ) : (
              <DriveGrid
                items={driveItems}
                viewMode={viewMode}
                loadingItemIds={actionLoadingIds}
                onOpen={driveFilter === 'mine' ? openFolder : () => {}}
                onPreview={setPreview}
                onRename={() => {}}
                onMove={() => {}}
                onCopy={() => {}}
                onShare={() => {}}
                onStar={() => {}}
                onTrash={() => {}}
                onDownload={handleDownload}
                onDownloadZip={handleDownloadZip}
              />
            )}
          </div>
        )}
      </div>

      {preview && <FilePreview item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

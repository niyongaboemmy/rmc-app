import { apiClient } from './api';

const FILE_SERVER_URL = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
function fileUrl(key: string): string {
  return `${FILE_SERVER_URL}/api/v1/files/${key}`;
}

export type DriveItemType = 'file' | 'folder';
export type DriveSharePermission = 'viewer' | 'editor' | 'owner';

export interface DriveItem {
  id: string;
  name: string;
  type: DriveItemType;
  mimeType: string | null;
  storageKey: string | null;
  size: number | null;
  parentId: string | null;
  ownerId: string;
  owner?: { id: string; firstName: string; lastName: string; email: string };
  isTrashed: boolean;
  trashedAt: string | null;
  isStarred: boolean;
  color: string | null;
  description: string | null;
  shares?: DriveShare[];
  sharedPermission?: DriveSharePermission;
  sharedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface DriveShare {
  id: string;
  itemId: string;
  sharedWithId: string;
  sharedWith?: { id: string; firstName: string; lastName: string; email: string; phone: string };
  sharedById: string;
  sharedBy?: { id: string; firstName: string; lastName: string };
  permission: DriveSharePermission;
  createdAt: string;
}

export interface DriveUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhotoUrl: string | null;
}

export interface DriveStorageStats {
  usedBytes: number;
  totalFiles: number;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

// ── List & Search ──────────────────────────────────────────────────────────────

export const listItems = async (parentId?: string, trashed = false): Promise<DriveItem[]> => {
  const params: Record<string, string> = {};
  if (parentId) params.parentId = parentId;
  if (trashed) params.trashed = 'true';
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive', { params });
  return (res.data as any).data ?? res.data;
};

export const listSharedWithMe = async (): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive/shared-with-me');
  return (res.data as any).data ?? res.data;
};

export const listStarred = async (): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive/starred');
  return (res.data as any).data ?? res.data;
};

export const listTrash = async (): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive/trash');
  return (res.data as any).data ?? res.data;
};

export const searchItems = async (q: string): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive/search', { params: { q } });
  return (res.data as any).data ?? res.data;
};

export const getStorageStats = async (): Promise<DriveStorageStats> => {
  const res = await apiClient.get<{ data: DriveStorageStats }>('/drive/stats');
  return (res.data as any).data ?? res.data;
};

export const getBreadcrumb = async (folderId: string): Promise<Breadcrumb[]> => {
  const res = await apiClient.get<{ data: Breadcrumb[] }>(`/drive/${folderId}/breadcrumb`);
  return (res.data as any).data ?? res.data;
};

export const searchUsers = async (q: string): Promise<DriveUser[]> => {
  const res = await apiClient.get<{ data: DriveUser[] }>('/drive/users/search', { params: { q } });
  return (res.data as any).data ?? res.data;
};

// ── Admin ──────────────────────────────────────────────────────────────────────

export const adminListAll = async (parentId?: string): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>('/drive/admin/all', {
    params: parentId ? { parentId } : {},
  });
  return (res.data as any).data ?? res.data;
};

export const adminListUserFiles = async (userId: string): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>(`/drive/admin/user/${userId}`);
  return (res.data as any).data ?? res.data;
};

export const adminListSharedWithUser = async (userId: string): Promise<DriveItem[]> => {
  const res = await apiClient.get<{ data: DriveItem[] }>(`/drive/admin/user/${userId}/shared-with`);
  return (res.data as any).data ?? res.data;
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getItem = async (id: string): Promise<DriveItem> => {
  const res = await apiClient.get<{ data: DriveItem }>(`/drive/${id}`);
  return (res.data as any).data ?? res.data;
};

export const createFolder = async (name: string, parentId?: string, color?: string): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>('/drive/folders', { name, parentId, color });
  return (res.data as any).data ?? res.data;
};

export const addFile = async (payload: {
  name: string;
  storageKey: string;
  mimeType?: string;
  size?: number;
  parentId?: string;
}): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>('/drive/files', payload);
  return (res.data as any).data ?? res.data;
};

export const updateItem = async (
  id: string,
  dto: { name?: string; color?: string; description?: string; isStarred?: boolean },
): Promise<DriveItem> => {
  const res = await apiClient.patch<{ data: DriveItem }>(`/drive/${id}`, dto);
  return (res.data as any).data ?? res.data;
};

export const moveItem = async (id: string, targetFolderId?: string | null): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>(`/drive/${id}/move`, { targetFolderId });
  return (res.data as any).data ?? res.data;
};

export const copyItem = async (id: string, targetFolderId?: string | null): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>(`/drive/${id}/copy`, { targetFolderId });
  return (res.data as any).data ?? res.data;
};

export const trashItem = async (id: string): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>(`/drive/${id}/trash`);
  return (res.data as any).data ?? res.data;
};

export const restoreItem = async (id: string): Promise<DriveItem> => {
  const res = await apiClient.post<{ data: DriveItem }>(`/drive/${id}/restore`);
  return (res.data as any).data ?? res.data;
};

export const permanentDelete = async (id: string): Promise<void> => {
  await apiClient.delete(`/drive/${id}`);
};

// ── Sharing ───────────────────────────────────────────────────────────────────

export const listShares = async (id: string): Promise<DriveShare[]> => {
  const res = await apiClient.get<{ data: DriveShare[] }>(`/drive/${id}/shares`);
  return (res.data as any).data ?? res.data;
};

export const shareItem = async (
  id: string,
  userIds: string[],
  permission: 'viewer' | 'editor',
): Promise<DriveShare[]> => {
  const res = await apiClient.post<{ data: DriveShare[] }>(`/drive/${id}/share`, {
    userIds,
    permission,
  });
  return (res.data as any).data ?? res.data;
};

export const removeShare = async (itemId: string, shareId: string): Promise<void> => {
  await apiClient.delete(`/drive/${itemId}/shares/${shareId}`);
};

// ── Utilities ─────────────────────────────────────────────────────────────────

export const getFileUrl = (key: string) => fileUrl(key);

export const getZipDownloadUrl = (id: string): string => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : '';
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  return `${base}/drive/${id}/download-zip`;
};

export const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export const getFileIcon = (item: DriveItem): string => {
  if (item.type === 'folder') return 'folder';
  const mime = item.mimeType || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'sheet';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slides';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'zip';
  if (mime.startsWith('text/')) return 'text';
  return 'file';
};

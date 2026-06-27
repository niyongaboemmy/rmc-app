'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, UserCircle, Share2, Trash2, ChevronDown } from 'lucide-react';
import {
  DriveItem, DriveShare, DriveUser,
  searchUsers, shareItem, listShares, removeShare,
} from '@/lib/driveApi';
import { DriveItemIcon } from './DriveItemIcon';

interface ShareModalProps {
  item: DriveItem;
  onClose: () => void;
}

export function ShareModal({ item, onClose }: ShareModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DriveUser[]>([]);
  const [selected, setSelected] = useState<DriveUser[]>([]);
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<DriveShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  // Track search input rect so we can portal the dropdown
  const inputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listShares(item.id).then(setShares).catch(() => {});
  }, [item.id]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const users = await searchUsers(q);
      const sharedIds = new Set(shares.map((s) => s.sharedWithId));
      const selectedIds = new Set(selected.map((u) => u.id));
      setResults(users.filter((u) => !sharedIds.has(u.id) && !selectedIds.has(u.id)));
    } catch {}
    finally { setLoading(false); }
  }, [shares, selected]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const addUser = (user: DriveUser) => {
    setSelected((prev) => [...prev, user]);
    setResults([]);
    setQuery('');
  };

  const removeSelected = (id: string) => setSelected((prev) => prev.filter((u) => u.id !== id));

  const handleShare = async () => {
    if (!selected.length) return;
    setSharing(true);
    setError('');
    try {
      await shareItem(item.id, selected.map((u) => u.id), permission);
      const updated = await listShares(item.id);
      setShares(updated);
      setSelected([]);
    } catch {
      setError('Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await removeShare(item.id, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch {}
  };

  // Compute dropdown position anchored to the input wrapper
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (results.length > 0 && inputWrapRef.current) {
      const rect = inputWrapRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 100000,
      });
    }
  }, [results.length]);

  const modal = (
    <div className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <Share2 className="w-5 h-5 text-rmc-green shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-sm">Share</h2>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
              <DriveItemIcon item={item} size="sm" />
              {item.name}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Search + permission row */}
          <div className="flex gap-2">
            <div ref={inputWrapRef} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green"
              />
            </div>
            <PermissionSelect value={permission} onChange={setPermission} />
          </div>

          {/* Selected users chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1.5 bg-rmc-green/10 text-rmc-green text-xs px-2.5 py-1 rounded-full font-medium"
                >
                  {user.firstName} {user.lastName}
                  <button
                    onClick={() => removeSelected(user.id)}
                    className="hover:bg-rmc-green/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {selected.length > 0 && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-2.5 bg-rmc-green text-white text-sm font-semibold rounded-xl hover:bg-rmc-green/90 transition-colors disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : `Share with ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
            </button>
          )}

          {/* Current shares */}
          {shares.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                People with access
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <UserAvatar user={share.sharedWith as DriveUser} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {share.sharedWith?.firstName} {share.sharedWith?.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{share.sharedWith?.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">
                      {share.permission}
                    </span>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search results dropdown — rendered in a portal to escape any clipping */}
      {results.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => addUser(user)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function UserAvatar({ user, size }: { user: DriveUser | undefined; size: 'sm' | 'md' }) {
  if (!user) return <UserCircle className={size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'} />;
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`;
  return (
    <div
      className={`${
        size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
      } rounded-full bg-rmc-green/20 text-rmc-green font-bold flex items-center justify-center shrink-0`}
    >
      {initials}
    </div>
  );
}

function PermissionSelect({
  value,
  onChange,
}: {
  value: 'viewer' | 'editor';
  onChange: (v: 'viewer' | 'editor') => void;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'viewer' | 'editor')}
        className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-rmc-green/30 cursor-pointer"
      >
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

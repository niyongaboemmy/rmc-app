'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Folder, Home, X, Move, Copy } from 'lucide-react';
import { DriveItem, listItems } from '@/lib/driveApi';

interface MoveModalProps {
  item: DriveItem;
  mode: 'move' | 'copy';
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => Promise<void>;
}

export function MoveModal({ item, mode, onClose, onConfirm }: MoveModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [crumbs, setCrumbs] = useState<{ id?: string; name: string }[]>([{ name: 'My Drive' }]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    listItems(currentFolderId, false)
      .then((all) => setItems(all.filter((i) => i.type === 'folder' && i.id !== item.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFolderId, item.id]);

  const openFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToCrumb = (index: number) => {
    const crumb = crumbs[index];
    setCurrentFolderId(crumb.id);
    setCrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(currentFolderId ?? null);
      onClose();
    } catch {}
    finally { setSubmitting(false); }
  };

  const Icon = mode === 'move' ? Move : Copy;
  const label = mode === 'move' ? 'Move' : 'Copy';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <Icon className="w-5 h-5 text-rmc-green" />
          <h2 className="font-semibold text-gray-900 text-sm flex-1">
            {label} &ldquo;{item.name}&rdquo;
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-5 py-2 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-auto">
          {crumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
              <button
                onClick={() => navigateToCrumb(i)}
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors
                  ${i === crumbs.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
              >
                {i === 0 && <Home className="w-3 h-3" />}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No folders here</p>
          ) : (
            items.map((folder) => (
              <button
                key={folder.id}
                onDoubleClick={() => openFolder(folder)}
                onClick={() => {}}
                className="flex items-center gap-3 w-full px-5 py-2.5 hover:bg-gray-50 transition-colors text-left group"
              >
                <Folder className="w-5 h-5 text-blue-400 fill-blue-400/80 shrink-0" style={folder.color ? { color: folder.color, fill: folder.color } : {}} />
                <span className="text-sm text-gray-800 flex-1 truncate">{folder.name}</span>
                <ChevronRight
                  onClick={(e) => { e.stopPropagation(); openFolder(folder); }}
                  className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <p className="text-xs text-gray-400 truncate">
            Destination: <span className="font-medium text-gray-600">{crumbs[crumbs.length - 1].name}</span>
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="px-4 py-2 text-sm bg-rmc-green text-white rounded-lg hover:bg-rmc-green/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Icon className="w-3.5 h-3.5" />
              {submitting ? 'Processing...' : label + ' here'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

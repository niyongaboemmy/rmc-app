'use client';

import { useState, useCallback } from 'react';
import { Star, MoreVertical, Users } from 'lucide-react';
import { DriveItem, formatBytes } from '@/lib/driveApi';
import { DriveItemIcon } from './DriveItemIcon';
import { DriveContextMenu } from './DriveContextMenu';

type ViewMode = 'grid' | 'list';

interface DriveGridProps {
  items: DriveItem[];
  viewMode: ViewMode;
  isTrash?: boolean;
  loadingItemIds?: Set<string>;
  onOpen: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onCopy: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
  onStar: (item: DriveItem) => void;
  onTrash: (item: DriveItem) => void;
  onRestore?: (item: DriveItem) => void;
  onPermanentDelete?: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onDownloadZip?: (item: DriveItem) => void;
}

interface ContextState { item: DriveItem; x: number; y: number }

export function DriveGrid({
  items, viewMode, isTrash = false, loadingItemIds,
  onOpen, onPreview, onRename, onMove, onCopy, onShare, onStar,
  onTrash, onRestore, onPermanentDelete, onDownload, onDownloadZip,
}: DriveGridProps) {
  const [context, setContext] = useState<ContextState | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: DriveItem) => {
    e.preventDefault();
    setContext({ item, x: e.clientX, y: e.clientY });
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Star className="w-8 h-8" />
        </div>
        <p className="text-base font-medium">Nothing here</p>
        <p className="text-sm mt-1">Drag &amp; drop files or create a new folder</p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <GridCard
              key={item.id}
              item={item}
              isLoading={loadingItemIds?.has(item.id) ?? false}
              onDoubleClick={() => item.type === 'folder' ? onOpen(item) : onPreview(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              onMoreClick={(e) => { e.stopPropagation(); setContext({ item, x: e.clientX, y: e.clientY }); }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="hidden sm:grid grid-cols-[1fr,auto,auto,auto] gap-x-4 px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100">
            <span>Name</span>
            <span className="text-right w-24">Modified</span>
            <span className="text-right w-20">Size</span>
            <span className="w-8" />
          </div>
          {items.map((item) => (
            <ListRow
              key={item.id}
              item={item}
              isLoading={loadingItemIds?.has(item.id) ?? false}
              onDoubleClick={() => item.type === 'folder' ? onOpen(item) : onPreview(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              onMoreClick={(e) => { e.stopPropagation(); setContext({ item, x: e.clientX, y: e.clientY }); }}
            />
          ))}
        </div>
      )}

      {context && (
        <DriveContextMenu
          x={context.x} y={context.y}
          item={context.item}
          isTrash={isTrash}
          onClose={() => setContext(null)}
          onOpen={() => onOpen(context.item)}
          onPreview={() => onPreview(context.item)}
          onRename={() => onRename(context.item)}
          onMove={() => onMove(context.item)}
          onCopy={() => onCopy(context.item)}
          onShare={() => onShare(context.item)}
          onStar={() => onStar(context.item)}
          onTrash={() => onTrash(context.item)}
          onRestore={onRestore ? () => onRestore!(context.item) : undefined}
          onPermanentDelete={onPermanentDelete ? () => onPermanentDelete!(context.item) : undefined}
          onDownload={() => onDownload(context.item)}
          onDownloadZip={onDownloadZip ? () => onDownloadZip!(context.item) : undefined}
        />
      )}
    </>
  );
}

interface CardProps {
  item: DriveItem;
  isLoading: boolean;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMoreClick: (e: React.MouseEvent) => void;
}

function SharedBadge({ item }: { item: DriveItem }) {
  if (!item.sharedBy) return null;
  const name = `${item.sharedBy.firstName} ${item.sharedBy.lastName}`.trim();
  return (
    <span
      title={`Shared by ${name}`}
      className="group/badge relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 cursor-default"
    >
      <Users className="w-2.5 h-2.5" />
      Shared
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap bg-gray-900 text-white text-[10px] rounded-md px-2 py-1 opacity-0 group-hover/badge:opacity-100 transition-opacity z-50 shadow-lg">
        Shared by {name}
      </span>
    </span>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
      <div className="w-5 h-5 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function GridCard({ item, isLoading, onDoubleClick, onContextMenu, onMoreClick }: CardProps) {
  const isImage = item.type === 'file' && item.mimeType?.startsWith('image/') && item.storageKey;
  const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';

  return (
    <div
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className="group relative flex flex-col rounded-xl border cursor-pointer transition-all select-none border-gray-200 bg-white hover:border-rmc-green/40 hover:shadow-md"
    >
      {isLoading && <LoadingOverlay />}

      {/* Thumbnail */}
      <div className="flex items-center justify-center h-24 sm:h-28 rounded-t-xl bg-gray-50 overflow-hidden">
        {isImage ? (
          <img
            src={`${FILE_SERVER}/api/v1/files/${item.storageKey}`}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <DriveItemIcon item={item} size="xl" />
        )}
        {item.isStarred && (
          <Star className="absolute top-2 left-2 w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col px-2 py-2 gap-1">
        <div className="flex items-center gap-1">
          <DriveItemIcon item={item} size="sm" />
          <p className="text-xs font-medium text-gray-800 truncate flex-1">{item.name}</p>
          <button
            onClick={onMoreClick}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all shrink-0"
          >
            <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        {item.sharedBy && (
          <div className="px-0.5">
            <SharedBadge item={item} />
          </div>
        )}
      </div>
    </div>
  );
}

function ListRow({ item, isLoading, onDoubleClick, onContextMenu, onMoreClick }: CardProps) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className="group relative grid grid-cols-[1fr,auto] sm:grid-cols-[1fr,auto,auto,auto] gap-x-4 items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none hover:bg-gray-50"
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
          <div className="w-4 h-4 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-3 min-w-0">
        <DriveItemIcon item={item} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="text-sm text-gray-800 truncate block">{item.name}</span>
          {item.sharedBy && (
            <div className="mt-0.5">
              <SharedBadge item={item} />
            </div>
          )}
        </div>
        {item.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
      </div>

      <span className="hidden sm:block text-xs text-gray-400 text-right w-24">
        {new Date(item.updatedAt).toLocaleDateString()}
      </span>
      <span className="hidden sm:block text-xs text-gray-400 text-right w-20">
        {item.type === 'folder' ? '—' : formatBytes(item.size)}
      </span>
      <button
        onClick={onMoreClick}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all w-8 flex justify-center"
      >
        <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );
}

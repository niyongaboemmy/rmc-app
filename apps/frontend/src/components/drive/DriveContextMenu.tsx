'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye, Download, Pencil, Trash2, RefreshCw, Copy,
  Move, Share2, Star, StarOff, FolderOpen, Archive,
} from 'lucide-react';
import { DriveItem } from '@/lib/driveApi';

export interface ContextAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface DriveContextMenuProps {
  x: number;
  y: number;
  item: DriveItem;
  onClose: () => void;
  isTrash?: boolean;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onShare: () => void;
  onStar: () => void;
  onTrash: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  onDownload: () => void;
  onDownloadZip?: () => void;
  onOpen?: () => void;
}

const MENU_W = 212;

export function DriveContextMenu({
  x, y, item, onClose, isTrash = false,
  onPreview, onRename, onMove, onCopy, onShare, onStar,
  onTrash, onRestore, onPermanentDelete, onDownload, onDownloadZip, onOpen,
}: DriveContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const actions: ContextAction[] = isTrash
    ? [
        { label: 'Restore', icon: RefreshCw, onClick: onRestore ?? (() => {}) },
        { label: 'Delete permanently', icon: Trash2, onClick: onPermanentDelete ?? (() => {}), danger: true, dividerBefore: true },
      ]
    : [
        ...(item.type === 'folder' ? [{ label: 'Open', icon: FolderOpen, onClick: onOpen ?? (() => {}) }] : []),
        ...(item.type === 'file' ? [{ label: 'Preview', icon: Eye, onClick: onPreview }] : []),
        { label: item.isStarred ? 'Unstar' : 'Star', icon: item.isStarred ? StarOff : Star, onClick: onStar },
        { label: 'Share', icon: Share2, onClick: onShare, dividerBefore: true },
        { label: item.type === 'folder' ? 'Download as ZIP' : 'Download', icon: item.type === 'folder' ? Archive : Download, onClick: item.type === 'folder' ? (onDownloadZip ?? onDownload) : onDownload },
        { label: 'Rename', icon: Pencil, onClick: onRename, dividerBefore: true },
        { label: 'Move to', icon: Move, onClick: onMove },
        { label: 'Make a copy', icon: Copy, onClick: onCopy },
        { label: 'Move to trash', icon: Trash2, onClick: onTrash, danger: true, dividerBefore: true },
      ];

  // Clamp position so menu stays within viewport with 8px margin
  const menuH = actions.length * 38 + 16;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(x, vw - MENU_W - 8);
  const top = Math.min(y, vh - menuH - 8);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 99999, width: MENU_W }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {actions.map((action, i) => (
        <div key={i}>
          {action.dividerBefore && <div className="my-1 border-t border-gray-100" />}
          <button
            onClick={() => { action.onClick(); onClose(); }}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors
              ${action.danger
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <action.icon className="w-4 h-4 shrink-0 opacity-70" />
            {action.label}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

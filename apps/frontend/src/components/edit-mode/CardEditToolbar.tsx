'use client';

/**
 * Floating per-card action toolbar for in-context Edit Mode. Overlaid on a
 * collection item (the item's container must be `position: relative`) it exposes
 * reorder (move up/down), delete, and an optional "Edit details" action that
 * opens the item's full editor modal. Keyboard-accessible buttons; not shown to
 * the public.
 */

import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Pencil } from 'lucide-react';

interface CardEditToolbarProps {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  /** When provided, shows a pencil that opens the item's full editor. */
  onEdit?: () => void;
  className?: string;
}

export function CardEditToolbar({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
  onEdit,
  className = '',
}: CardEditToolbarProps) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const btn =
    'grid h-7 w-7 place-items-center rounded-md text-white/90 transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div
      className={`absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-lg border border-white/10 bg-gray-900/90 px-1 py-1 shadow-lg backdrop-blur-sm ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {onEdit && (
        <button type="button" onClick={stop(onEdit)} className={btn} title="Edit details" aria-label="Edit details">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={stop(onMoveUp)}
        disabled={!canMoveUp}
        className={btn}
        title="Move up"
        aria-label="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={stop(onMoveDown)}
        disabled={!canMoveDown}
        className={btn}
        title="Move down"
        aria-label="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={stop(onDelete)}
        className={`${btn} hover:bg-red-500/80`}
        title="Delete"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

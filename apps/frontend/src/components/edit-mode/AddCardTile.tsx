'use client';

/**
 * Dashed "＋ Add" tile dropped in as the last child of a collection grid while a
 * super-admin is editing. Clicking it appends a new item (or opens an editor for
 * item types that need required fields first). Rendered only in edit mode.
 */

import React from 'react';
import { Plus } from 'lucide-react';

interface AddCardTileProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function AddCardTile({ label, onClick, className = '' }: AddCardTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[8rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rmc-green/30 bg-rmc-green/[0.03] p-6 text-rmc-green/70 transition-colors hover:border-rmc-green/60 hover:bg-rmc-green/[0.06] hover:text-rmc-green ${className}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-rmc-green/10 transition-colors group-hover:bg-rmc-green/20">
        <Plus className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

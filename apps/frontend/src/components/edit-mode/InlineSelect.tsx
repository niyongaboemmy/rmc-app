'use client';

/**
 * Compact popover picker for a small enum in in-context Edit Mode — e.g. the
 * lucide icon on an Areas pillar card. Rendered only while editing. The trigger
 * shows the current option (icon and/or label); clicking opens a popover of
 * choices. Closes on outside-click or Escape. Edits flow up via `onChange`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface InlineSelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
}

export function InlineSelect({
  value,
  options,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Choose option',
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const CurrentIcon = current?.icon;

  return (
    <div ref={rootRef} className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded-md border border-rmc-green/40 bg-white px-1.5 py-1 text-gray-700 shadow-sm hover:border-rmc-green/70 hover:text-rmc-green"
      >
        {CurrentIcon ? <CurrentIcon className="h-3.5 w-3.5" /> : <span className="text-[11px] font-semibold">{current?.label}</span>}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
        >
          {options.map((o) => {
            const OptIcon = o.icon;
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                  selected ? 'bg-rmc-green/10 text-rmc-green' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {OptIcon && <OptIcon className="h-4 w-4 shrink-0" />}
                <span className="flex-1 font-medium">{o.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

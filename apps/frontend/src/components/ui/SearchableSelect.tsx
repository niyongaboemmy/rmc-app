'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noneLabel?: string;
  className?: string;
  /** Trigger sizing. 'sm' matches the compact admin inputs (mosques);
   *  'md' matches the standard rounded-xl / py-2.5 form inputs used elsewhere. */
  size?: 'sm' | 'md';
  /** Overrides the trigger button styling (padding, radius, ring…) so the
   *  control can match the surrounding form inputs. Merged via tailwind-merge. */
  triggerClassName?: string;
  disabled?: boolean;
  /** Stacking of the portaled menu. Default clears app modals (z 9999);
   *  pass a lower value on plain pages so it stays under the fixed navbar. */
  zIndex?: number;
}

/** Anchored by `top` when the menu drops down, by `bottom` when it flips up — pinning
 *  the flipped menu to its bottom edge keeps it against the trigger at any height. */
interface DropdownRect { top?: number; bottom?: number; left: number; width: number; maxHeight: number; }

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  noneLabel,
  className,
  size = 'sm',
  triggerClassName,
  disabled,
  zIndex = 99999,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const updateRect = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const dropUp = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, Math.max(dropUp ? spaceAbove : spaceBelow, 120));
    // Narrow triggers (compact filters) would clip long option labels, so the menu
    // is allowed to grow past the trigger — then clamped to stay inside the viewport.
    const width = Math.min(Math.max(r.width, 224), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setRect(
      dropUp
        ? { bottom: window.innerHeight - r.top + 4, left, width, maxHeight }
        : { top: r.bottom + 4, left, width, maxHeight },
    );
  }, []);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  function handleOpen() {
    updateRect();
    setOpen(true);
  }

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
    }
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open, close]);

  function handleSelect(val: string) { onChange(val); close(); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Escape') close(); }

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : handleOpen())}
        className={cn(
          'w-full border border-gray-200 text-gray-900',
          'flex items-center justify-between gap-2 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-rmc-green/50 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'md'
            ? 'rounded-xl px-3.5 py-2.5 text-sm'
            : 'rounded-lg px-3 py-1.5 text-[13px]',
          open && 'ring-2 ring-rmc-green/50 border-transparent',
          triggerClassName,
        )}
      >
        {/* min-w-0 is required: a nowrap flex child won't shrink below its text
            width without it, so a long label overflows instead of ellipsising. */}
        <span className={cn('min-w-0 truncate text-left', !selected && 'text-gray-400')}>
          {selected ? selected.label : noneLabel ?? placeholder}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && rect && mounted && createPortal(
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          style={{ position: 'fixed', top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, zIndex }}
          className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              // min-w-0: without it the input keeps its default intrinsic width, overflows
              // the row, and focusing it on open scrolls the clipped menu sideways.
              className="min-w-0 flex-1 text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
            />
          </div>
          <div style={{ maxHeight: rect.maxHeight }} className="overflow-y-auto py-1">
            {noneLabel !== undefined && (
              <OptionRow label={noneLabel} selected={value === ''} onSelect={() => handleSelect('')} isNone />
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[13px] text-gray-400">No results</p>
            )}
            {filtered.map((o) => (
              <OptionRow key={o.value} label={o.label} selected={o.value === value} onSelect={() => handleSelect(o.value)} />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function OptionRow({ label, selected, onSelect, isNone }: {
  label: string; selected: boolean; onSelect: () => void; isNone?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] text-left',
        'hover:bg-gray-50 transition-colors',
        selected && 'bg-rmc-green/5 text-rmc-green font-medium',
        isNone && 'text-gray-400 italic',
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
}

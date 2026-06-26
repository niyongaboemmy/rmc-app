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
  disabled?: boolean;
}

interface DropdownRect { top: number; left: number; width: number; maxHeight: number; }

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  noneLabel,
  className,
  disabled,
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
    const maxHeight = Math.max(spaceBelow, spaceAbove, 120);
    const top = spaceBelow >= 120 ? r.bottom + 4 : r.top - Math.min(maxHeight, 260) - 4;
    setRect({ top, left: r.left, width: r.width, maxHeight: Math.min(maxHeight, 260) });
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
          'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-900',
          'flex items-center justify-between gap-2 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-rmc-green/50 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'ring-2 ring-rmc-green/50 border-transparent',
        )}
      >
        <span className={cn(!selected && 'text-gray-400')}>
          {selected ? selected.label : noneLabel ?? placeholder}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && rect && mounted && createPortal(
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 99999 }}
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
              className="flex-1 text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
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
        'w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left',
        'hover:bg-gray-50 transition-colors',
        selected && 'bg-rmc-green/5 text-rmc-green font-medium',
        isNone && 'text-gray-400 italic',
      )}
    >
      <span>{label}</span>
      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
}

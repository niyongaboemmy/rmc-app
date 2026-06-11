'use client';

import {
  ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ─── Option types ─────────────────────────────────────────────────────────────

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ComboboxOptionGroup {
  group: string;
  options: ComboboxOption[];
}

type RawOptions = ComboboxOption[] | ComboboxOptionGroup[];

function isGrouped(opts: RawOptions): opts is ComboboxOptionGroup[] {
  return opts.length > 0 && 'group' in opts[0];
}

function flattenOptions(opts: RawOptions): ComboboxOption[] {
  if (!opts.length) return [];
  return isGrouped(opts)
    ? (opts as ComboboxOptionGroup[]).flatMap((g) => g.options)
    : (opts as ComboboxOption[]);
}

// ─── Flat item list (options + group headers) ─────────────────────────────────

type ListItem =
  | { kind: 'group'; label: string }
  | { kind: 'option'; option: ComboboxOption; index: number };

function buildList(opts: RawOptions): ListItem[] {
  const items: ListItem[] = [];
  let i = 0;
  if (isGrouped(opts)) {
    for (const g of opts as ComboboxOptionGroup[]) {
      items.push({ kind: 'group', label: g.group });
      for (const o of g.options) items.push({ kind: 'option', option: o, index: i++ });
    }
  } else {
    for (const o of opts as ComboboxOption[]) items.push({ kind: 'option', option: o, index: i++ });
  }
  return items;
}

// ─── Dropdown positioning ─────────────────────────────────────────────────────

const LIST_MAX_H = 300; // px

interface Rect {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

function measureTrigger(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  const below = window.innerHeight - r.bottom;
  const above = r.top;
  const openUp = below < LIST_MAX_H + 8 && above > below;
  return {
    top: openUp ? r.top - 8 : r.bottom + 6,
    left: r.left,
    width: r.width,
    openUp,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComboboxBaseProps {
  options: RawOptions;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  id?: string;
}

interface SingleProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string | null;
  onChange?: (val: string | null) => void;
}

interface MultiProps extends ComboboxBaseProps {
  multiple: true;
  value?: string[];
  onChange?: (vals: string[]) => void;
}

export type ComboboxProps = SingleProps | MultiProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function Combobox(props: ComboboxProps) {
  const {
    options,
    placeholder = 'Select an option…',
    searchPlaceholder = 'Search…',
    label,
    error,
    hint,
    required,
    disabled,
    clearable = true,
    loading = false,
    emptyMessage = 'No results found',
    className,
    id,
  } = props;

  const isMulti = props.multiple === true;

  const selectedValues: string[] = isMulti
    ? ((props as MultiProps).value ?? [])
    : (props as SingleProps).value
    ? [(props as SingleProps).value as string]
    : [];

  const triggerRef  = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const genId = useId();
  const inputId = id ?? genId;

  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [focusedIdx, setFocused]  = useState(0);
  const [rect, setRect]           = useState<Rect | null>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── All options flat (for lookup) ──
  const allFlat = useMemo(() => flattenOptions(options), [options]);

  const optionMap = useMemo(() => {
    const m: Record<string, ComboboxOption> = {};
    allFlat.forEach((o) => { m[o.value] = o; });
    return m;
  }, [allFlat]);

  // ── Filtered options ──
  const filteredOptions = useMemo((): RawOptions => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    if (isGrouped(options)) {
      return (options as ComboboxOptionGroup[])
        .map((g) => ({
          group: g.group,
          options: g.options.filter(
            (o) =>
              o.label.toLowerCase().includes(q) ||
              o.description?.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.options.length > 0);
    }
    return (options as ComboboxOption[]).filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [options, search]);

  const listItems = useMemo(() => buildList(filteredOptions), [filteredOptions]);
  const flatFiltered = useMemo(() => flattenOptions(filteredOptions), [filteredOptions]);

  // ── Open / close ──
  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (triggerRef.current) setRect(measureTrigger(triggerRef.current));
    setOpen(true);
    setFocused(0);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch('');
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  // ── Selection ──
  const isSelected = (v: string) => selectedValues.includes(v);

  const selectOption = useCallback(
    (v: string) => {
      if (isMulti) {
        const prev = (props as MultiProps).value ?? [];
        const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
        (props as MultiProps).onChange?.(next);
      } else {
        const current = (props as SingleProps).value;
        (props as SingleProps).onChange?.(current === v ? null : v);
        closeDropdown();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMulti, props, closeDropdown],
  );

  const clearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMulti) (props as MultiProps).onChange?.([]);
      else (props as SingleProps).onChange?.(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMulti, props],
  );

  const removeTag = useCallback(
    (v: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isMulti) return;
      const prev = (props as MultiProps).value ?? [];
      (props as MultiProps).onChange?.(prev.filter((x) => x !== v));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMulti, props],
  );

  // ── Keyboard inside dropdown ──
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocused((i) => Math.min(i + 1, flatFiltered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocused((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const opt = flatFiltered[focusedIdx];
        if (opt && !opt.disabled) selectOption(opt.value);
        break;
      }
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
    }
  };

  // ── Keyboard on trigger ──
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      if (!open) openDropdown();
    }
    if (e.key === 'Escape') closeDropdown();
  };

  // ── Scroll focused item into view ──
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-opt]');
    items[focusedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx, open]);

  // ── Re-position on scroll / resize ──
  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      if (triggerRef.current) setRect(measureTrigger(triggerRef.current));
    };
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
    };
  }, [open]);

  // ── Close on outside click ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) closeDropdown();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeDropdown]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const hasValue = selectedValues.length > 0;

  // Trigger display
  const triggerBody = isMulti ? (
    hasValue ? (
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 py-0.5">
        {selectedValues.map((v) => {
          const opt = optionMap[v];
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-rmc-green-light text-rmc-green-dark text-[11px] font-semibold pl-2 pr-1 py-0.5 rounded-md max-w-[160px]"
            >
              {opt?.icon && <span className="shrink-0 text-xs">{opt.icon}</span>}
              <span className="truncate">{opt?.label ?? v}</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); removeTag(v, e); }}
                className="ml-0.5 p-0.5 rounded hover:bg-rmc-green/20 transition-colors shrink-0"
                aria-label={`Remove ${opt?.label ?? v}`}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>
    ) : (
      <span className="text-sm text-gray-400 select-none">{placeholder}</span>
    )
  ) : hasValue ? (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      {optionMap[selectedValues[0]]?.icon && (
        <span className="shrink-0 text-gray-500 text-base">
          {optionMap[selectedValues[0]].icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {optionMap[selectedValues[0]]?.label ?? selectedValues[0]}
        </p>
        {optionMap[selectedValues[0]]?.description && (
          <p className="text-[11px] text-gray-400 truncate leading-none mt-0.5">
            {optionMap[selectedValues[0]].description}
          </p>
        )}
      </div>
    </div>
  ) : (
    <span className="text-sm text-gray-400 select-none">{placeholder}</span>
  );

  // Dropdown panel
  const dropdown = rect && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        ...(rect.openUp
          ? { bottom: window.innerHeight - rect.top }
          : { top: rect.top }),
        left: rect.left,
        width: rect.width,
        zIndex: 99998,
        transformOrigin: rect.openUp ? 'bottom' : 'top',
      }}
      className="flex flex-col bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden animate-dropdown-in"
    >
      {/* ── Search bar ── */}
      <div className="px-2 pt-2 pb-1.5 shrink-0">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setFocused(0); }}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label="Search options"
            className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 rounded-xl border border-transparent focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/20 focus:bg-white outline-none transition-all placeholder:text-gray-400"
          />
          {search && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setSearch(''); setFocused(0); searchRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Options list ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-gray-400">
          <svg className="animate-spin h-4 w-4 text-rmc-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading options…
        </div>
      ) : flatFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <ul
          ref={listRef}
          role="listbox"
          aria-multiselectable={isMulti}
          aria-label={label ?? 'Options'}
          className="overflow-y-auto overscroll-contain py-1.5 px-1.5 space-y-0.5"
          style={{ maxHeight: LIST_MAX_H }}
        >
          {listItems.map((item, i) => {
            if (item.kind === 'group') {
              return (
                <li key={`group-${i}`} role="presentation">
                  <div className="flex items-center gap-2 px-2 pt-2.5 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                </li>
              );
            }

            const { option: opt, index: idx } = item;
            const selected = isSelected(opt.value);
            const focused  = idx === focusedIdx;

            return (
              <li
                key={opt.value}
                data-opt
                role="option"
                aria-selected={selected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => !opt.disabled && setFocused(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!opt.disabled) selectOption(opt.value);
                }}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-all duration-75',
                  opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                  focused && !opt.disabled
                    ? 'bg-rmc-green-light'
                    : selected
                    ? 'bg-rmc-green/8'
                    : 'hover:bg-gray-50',
                )}
              >
                {/* Option icon */}
                {opt.icon && (
                  <span
                    className={cn(
                      'shrink-0 text-lg leading-none',
                      selected ? 'opacity-100' : 'opacity-60',
                    )}
                    aria-hidden="true"
                  >
                    {opt.icon}
                  </span>
                )}

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm leading-snug truncate',
                      selected ? 'font-semibold text-rmc-green-dark' : 'font-medium text-gray-800',
                      focused && !selected && 'text-rmc-green-dark',
                    )}
                  >
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  )}
                </div>

                {/* Checkmark / checkbox indicator */}
                {isMulti ? (
                  <div
                    className={cn(
                      'shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150',
                      selected
                        ? 'bg-rmc-green border-rmc-green'
                        : 'border-gray-300',
                    )}
                    aria-hidden="true"
                  >
                    {selected && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                ) : selected ? (
                  <svg
                    className="shrink-0 w-4 h-4 text-rmc-green"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Multi footer ── */}
      {isMulti && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 shrink-0 bg-gray-50/60">
          <span className="text-xs text-gray-400 tabular-nums">
            {selectedValues.length
              ? `${selectedValues.length} selected`
              : 'None selected'}
          </span>
          <div className="flex items-center gap-3">
            {selectedValues.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); clearAll(e); }}
                className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); closeDropdown(); }}
              className="text-xs text-rmc-green hover:text-rmc-green-dark font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5 select-none"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <div
        ref={triggerRef}
        id={inputId}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        aria-label={label}
        onClick={open ? closeDropdown : openDropdown}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'group relative flex items-center gap-2 w-full min-h-[42px] px-3 py-2',
          'border rounded-xl transition-all duration-200 cursor-pointer select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/40 focus-visible:ring-offset-1',
          disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
            : open
            ? 'border-rmc-green ring-2 ring-rmc-green/15 bg-white shadow-sm'
            : error
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 bg-white hover:border-rmc-green/60 hover:shadow-sm',
        )}
      >
        {/* Left search icon (subtle, only when empty) */}
        {!hasValue && !isMulti && (
          <svg
            className="shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">{triggerBody}</div>

        {/* Right-side controls */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Clear button */}
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); clearAll(e); }}
              className={cn(
                'p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors',
              )}
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Divider */}
          {clearable && hasValue && !disabled && (
            <div className="w-px h-4 bg-gray-200" aria-hidden="true" />
          )}

          {/* Chevron */}
          <div
            className={cn(
              'p-1 rounded-lg transition-all duration-200',
              open ? 'text-rmc-green bg-rmc-green-light' : 'text-gray-400',
            )}
            aria-hidden="true"
          >
            <svg
              className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Hint / error */}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Portal dropdown */}
      {mounted && open && createPortal(dropdown, document.body)}
    </div>
  );
}

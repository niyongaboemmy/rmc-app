'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface LocaleOption {
  code: 'en' | 'rw' | 'ar';
  /** Emoji flag (falls back to the short label on platforms without flag glyphs). */
  flag: string;
  /** Short code shown in the compact trigger. */
  label: string;
  /** Language name in its own language. */
  name: string;
  rtl?: boolean;
}

const LOCALES: LocaleOption[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'rw', flag: '🇷🇼', label: 'RW', name: 'Ikinyarwanda' },
  { code: 'ar', flag: '🇸🇦', label: 'AR', name: 'العربية', rtl: true },
];

const MENU_ID = 'language-switcher-menu';
const MENU_LABEL_ID = 'language-switcher-menu-label';

/**
 * Language switcher — a menu button.
 *
 * Roles: `menu` + `menuitemradio`, not `listbox` + `option`. Choosing a language
 * navigates immediately rather than staging a value the way a listbox implies, and
 * the three are mutually exclusive, which is exactly what `menuitemradio` +
 * `aria-checked` describes. The markup previously claimed to be a listbox while
 * behaving like neither: it announced a widget with arrow-key navigation it did not
 * implement.
 *
 * Keyboard follows the WAI-ARIA menu-button pattern. The items are `tabIndex={-1}`
 * and focus is moved programmatically, so Tab leaves the whole control instead of
 * walking through the languages one at a time.
 */
export function LanguageSwitcher({ scrolled = false }: { scrolled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale: currentLocale } = useParams<{ locale: string }>();
  const [open, setOpen] = useState(false);
  /** Item that should hold DOM focus while the menu is open; -1 when it is closed. */
  const [activeIndex, setActiveIndex] = useState(-1);

  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentIndex = Math.max(
    0,
    LOCALES.findIndex((l) => l.code === currentLocale),
  );
  const current = LOCALES[currentIndex];
  const lastIndex = LOCALES.length - 1;

  const openMenu = useCallback((index: number) => {
    setOpen(true);
    setActiveIndex(index);
  }, []);

  /**
   * `returnFocus` is false for dismissals the user did not aim at the trigger —
   * an outside click, or a Tab that is already on its way somewhere else. Pulling
   * focus back in those cases would fight the user.
   */
  const closeMenu = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    closeMenu(true);
  };

  /* Move real DOM focus onto the active item. The menu is only visibility-hidden
     when closed, so this runs after the open class has been applied and the item is
     focusable again. */
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  /* Dismiss on outside click, and on Escape from anywhere while open. */
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  /* Opening from the trigger: Down lands on the current language, Up on the last —
     the standard menu-button shortcuts. */
  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu(currentIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(lastIndex);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i >= lastIndex ? 0 : i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? lastIndex : i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(lastIndex);
        break;
      case 'Tab':
        // Not prevented: the items are tabIndex={-1}, so the browser's own Tab skips
        // past the rest of the menu and out of the control, which is the wanted exit.
        closeMenu(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger — flag + code, so the current language is obvious at a glance */}
      <button
        ref={triggerRef}
        onClick={() => (open ? closeMenu(false) : openMenu(currentIndex))}
        onKeyDown={onTriggerKeyDown}
        className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          scrolled
            ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
            : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={MENU_ID}
        aria-label={`Change language — current: ${current.name}`}
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        <span>{current.label}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel — flag + native name + clear checked state.
          `invisible` is what actually closes this, not `opacity-0`: an element at zero
          opacity is still in the tab order and still read by screen readers, so the
          collapsed menu used to hand keyboard users three invisible language buttons
          and announce a menu the trigger reported as collapsed. `visibility` still
          animates alongside opacity, so the fade is unchanged. */}
      <div
        className={`absolute end-0 mt-2 w-48 rounded-lg bg-white shadow-xl shadow-black/10 border border-gray-100 overflow-hidden z-50 transition-all duration-200 origin-top ${
          open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
        }`}
      >
        <p
          id={MENU_LABEL_ID}
          className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400"
        >
          Language
        </p>
        {/* The heading sits OUTSIDE the menu and labels it by reference — a `menu` may
            only contain menu items, so leaving the <p> inside made the grouping a lie. */}
        <div id={MENU_ID} role="menu" aria-labelledby={MENU_LABEL_ID} onKeyDown={onMenuKeyDown}>
          {LOCALES.map(({ code, flag, name, rtl }, index) => {
            const checked = currentLocale === code;
            return (
              <button
                key={code}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => switchLocale(code)}
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                  checked
                    ? 'bg-rmc-green-light text-rmc-green-dark font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {flag}
                </span>
                <span dir={rtl ? 'rtl' : 'ltr'} className={rtl ? 'font-arabic' : ''}>
                  {name}
                </span>
                {checked && <Check className="ml-auto w-4 h-4 text-rmc-green shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

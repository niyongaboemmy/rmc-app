'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The behavioural shell shared by every full-screen file-preview overlay.
 *
 * There were two near-identical copies of "portal to <body> + Esc-to-close +
 * body-scroll-lock" in the tree — `components/drive/FilePreview.tsx` and the
 * public tenders attachment modal — and this feature would have added a third.
 * This factors the CROSS-CUTTING BEHAVIOUR (not the chrome) into one place:
 *
 *   • createPortal onto document.body, so the overlay escapes any transformed
 *     or overflow-hidden ancestor and sits above the whole app.
 *   • Esc closes.
 *   • Body scroll is locked while open and restored on unmount.
 *   • A focus trap: focus moves into the dialog on open, Tab/Shift+Tab cycle
 *     WITHIN it, and on close focus returns to whatever was focused before —
 *     which, for the Library, is the book card the reader clicked. Neither of
 *     the two existing overlays trapped focus; both gain it for free here.
 *
 * It deliberately owns NO visual chrome beyond a `fixed inset-0` positioning
 * context. Each consumer supplies its own look (the Library and the drive
 * viewer are full-screen dark; a centred white card would pass its own
 * `className` and render a backdrop child). That is why the drive viewer could
 * adopt this without changing a single pixel, and why the centred tenders modal
 * — a structurally different shape with click-outside-to-close — was left as-is
 * rather than contorted through a `variant` prop.
 */
export interface PreviewOverlayShellProps {
  onClose: () => void;
  children: ReactNode;
  /** Extra classes on the `fixed inset-0` root — the consumer's background and layout. */
  className?: string;
  /** Stacking context. Matches FilePreview's `z-[99999]` by default. */
  zIndexClassName?: string;
  /** aria-label for the dialog when there is no visible title element to point at. */
  label?: string;
  /** id of the visible heading, preferred over `label` when one exists. */
  labelledBy?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,iframe,[tabindex]:not([tabindex="-1"])';

export function PreviewOverlayShell({
  onClose,
  children,
  className = '',
  zIndexClassName = 'z-[99999]',
  label,
  labelledBy,
}: PreviewOverlayShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Captured synchronously on mount so we can hand focus back to the exact
  // element (the triggering card) when the overlay unmounts.
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;

    // Move focus inside. The container is tabIndex=-1 so it can hold focus
    // before any child (e.g. while a PDF is still streaming and the toolbar is
    // the only focusable thing) is ready.
    const node = containerRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    return () => {
      // isConnected guards the case where the trigger was itself unmounted
      // (e.g. navigation) — refocusing a detached node throws in some browsers.
      const el = restoreRef.current;
      if (el && el.isConnected) el.focus();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const node = containerRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        // Nothing to tab to (bare loading state) — keep focus pinned inside.
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === node)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className={`fixed inset-0 ${zIndexClassName} outline-none ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * The icon button used across every overlay toolbar (close, download, open in
 * new tab, zoom…). Lifted verbatim from FilePreview so the three toolbars stay
 * visually identical.
 */
export function OverlayToolButton({
  onClick,
  title,
  children,
  className = '',
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-white/10 sm:p-2 ${className}`}
    >
      {children}
    </button>
  );
}

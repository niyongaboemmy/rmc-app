'use client';

import {
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  useState,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  /** Override the auto-injected close button */
  hideClose?: boolean;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

// ---------------------------------------------------------------------------
// Internal context — lets ModalHeader inherit the close handler
// ---------------------------------------------------------------------------

interface ModalCtx {
  close: () => void;
  titleId: string;
}

const ModalContext = createContext<ModalCtx | null>(null);

// ---------------------------------------------------------------------------
// Focusable elements selector
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  );
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs:   'max-w-xs',
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl':'max-w-2xl',
  full: 'max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-4rem)]',
};

// ---------------------------------------------------------------------------
// Modal root
// ---------------------------------------------------------------------------

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Stable close with exit animation
  const handleClose = useCallback(() => {
    setClosing(true);
    // Wait for CSS exit animation before unmounting
    const t = setTimeout(() => {
      setClosing(false);
      onClose();
    }, 160);
    return () => clearTimeout(t);
  }, [onClose]);

  // ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [isOpen, closeOnEsc, handleClose]);

  // Focus trap — Tab / Shift+Tab
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(panel);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Save previous focus & move focus into modal on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // defer so the DOM is rendered
      const t = setTimeout(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = getFocusable(panel);
        if (focusable.length > 0) focusable[0].focus();
        else panel.focus();
      }, 20);
      return () => clearTimeout(t);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!mounted) return null;
  if (!isOpen && !closing) return null;

  const content = (
    /*
     * Root layer — sits above every page element, sidebar, topbar, and
     * any z-index used in the app (sidebar ~40, toasts z-[60]).
     * `isolate` creates a new stacking context so children don't leak out.
     */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        'fixed inset-0 z-[9999] isolate',
        'flex items-end sm:items-center justify-center',
        'p-0 sm:p-6',
      )}
    >
      {/* Backdrop — fills the entire viewport behind the panel */}
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? handleClose : undefined}
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-[3px]',
          closing ? 'animate-overlay-out' : 'animate-overlay-in',
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          // Layout
          'relative w-full flex flex-col',
          'outline-none',
          // Shape & surface
          'bg-white',
          'rounded-t-3xl sm:rounded-2xl',
          'shadow-[0_24px_64px_-10px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.04)]',
          // Responsive height — body area scrolls, header/footer stay fixed
          'max-h-[92dvh] sm:max-h-[calc(100dvh-3rem)]',
          // Width
          SIZE_CLASSES[size],
          // Animation
          closing ? 'animate-modal-out' : 'animate-modal-in',
          className,
        )}
      >

        <ModalContext.Provider value={{ close: handleClose, titleId }}>
          {children}
        </ModalContext.Provider>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ---------------------------------------------------------------------------
// ModalHeader
// ---------------------------------------------------------------------------

export function ModalHeader({ children, onClose, hideClose = false, className }: ModalHeaderProps) {
  const ctx = useContext(ModalContext);
  const close = onClose ?? ctx?.close;

  return (
    <div
      className={cn(
        'flex items-start justify-between',
        'px-6 pt-7 pb-5',
        'border-b border-gray-100 shrink-0',
        className,
      )}
    >
      <div className="flex-1 min-w-0 pr-4">{children}</div>

      {!hideClose && close && (
        <button
          type="button"
          onClick={close}
          aria-label="Close modal"
          className={cn(
            'shrink-0 -mt-1 flex items-center justify-center',
            'h-8 w-8 rounded-full',
            'text-gray-400 hover:text-gray-700',
            'bg-transparent hover:bg-gray-100',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2',
          )}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalTitle & ModalDescription
// ---------------------------------------------------------------------------

export function ModalTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(ModalContext);
  return (
    <h2
      id={ctx?.titleId}
      className={cn('text-[1.05rem] font-bold text-gray-900 leading-snug', className)}
    >
      {children}
    </h2>
  );
}

export function ModalDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-gray-500 mt-1 leading-relaxed', className)}>{children}</p>
  );
}

// ---------------------------------------------------------------------------
// ModalBody
// ---------------------------------------------------------------------------

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto',
        'px-6 py-5',
        // Custom thin scrollbar
        'scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalFooter
// ---------------------------------------------------------------------------

const FOOTER_ALIGN: Record<NonNullable<ModalFooterProps['align']>, string> = {
  left:    'justify-start',
  center:  'justify-center',
  right:   'justify-end',
  between: 'justify-between',
};

export function ModalFooter({ children, align = 'right', className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 shrink-0',
        'px-6 py-4',
        'border-t border-gray-100',
        'bg-gray-50/60 rounded-b-2xl',
        FOOTER_ALIGN[align],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmModal — opinionated preset
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const CONFIRM_ICONS: Record<'danger' | 'primary', ReactNode> = {
  danger: (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 shrink-0">
      <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    </div>
  ),
  primary: (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rmc-green-light mb-4 shrink-0">
      <svg className="w-6 h-6 text-rmc-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs">
      <ModalBody className="text-center pt-7 pb-2">
        {CONFIRM_ICONS[variant]}
        <h2 className="text-[1.05rem] font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
        )}
      </ModalBody>
      <ModalFooter align="center" className="pb-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200',
            'text-gray-700 bg-white hover:bg-gray-50',
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl',
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
              : 'bg-rmc-green hover:bg-rmc-green-dark focus-visible:ring-rmc-green',
          )}
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}

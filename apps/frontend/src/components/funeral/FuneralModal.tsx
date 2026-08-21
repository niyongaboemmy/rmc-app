'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable dialog shell for the funeral admin surfaces: backdrop, scroll-lock,
 * Escape-to-close, title bar and a footer slot. Presentation only — the caller
 * owns the form state and the confirm/cancel handlers.
 */
export function FuneralModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  closeLabel = 'Close',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}) {
  // Render into <body> so the fixed overlay covers the whole viewport,
  // escaping any ancestor transform/filter that would trap `position: fixed`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="flex justify-end gap-2.5 border-t border-gray-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

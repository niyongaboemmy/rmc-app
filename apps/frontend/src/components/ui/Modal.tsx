'use client';

import React, { useEffect, useRef, ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { X } from 'lucide-react';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  zIndex?: number;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-6xl',
};

/** Lightweight portal wrapper — renders children at document.body, escaping any stacking context */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(<>{children}</>, document.body);
}

export function Modal({ open, isOpen, onClose, children, size = 'md', className, zIndex }: ModalProps) {
  const visible = open ?? isOpen ?? false;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible || !mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ zIndex: zIndex ?? 9999 }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden',
          // Cap at viewport height and lay out as a column so the body can scroll
          // while the header and footer stay pinned in view.
          'max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col',
          'animate-fade-up',
          sizeClasses[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('shrink-0 px-6 pt-6 pb-4 border-b border-gray-100', className)}>{children}</div>;
}

export function ModalTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-bold text-gray-900 pr-8', className)}>{children}</h2>;
}

export function ModalDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn('text-sm text-gray-500 mt-1', className)}>{children}</p>;
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 py-4', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('shrink-0 px-6 pb-6 pt-3 border-t border-gray-100 flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}

interface ConfirmModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const text = message ?? description ?? '';
  return (
    <Modal open={open} isOpen={isOpen} onClose={onClose} size="sm" zIndex={10000}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600">{text}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : undefined}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

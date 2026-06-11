'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
  success: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'variant' | 'message'>>) => string;
  error: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'variant' | 'message'>>) => string;
  warning: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'variant' | 'message'>>) => string;
  info: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'variant' | 'message'>>) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const COLORS: Record<ToastVariant, { icon: string; progress: string }> = {
  success: { icon: 'text-green-500', progress: 'bg-green-500' },
  error:   { icon: 'text-red-500',   progress: 'bg-red-500' },
  warning: { icon: 'text-yellow-500', progress: 'bg-yellow-500' },
  info:    { icon: 'text-blue-500',  progress: 'bg-blue-500' },
};

const POSITIONS: Record<ToastPosition, string> = {
  'top-left':      'top-4 left-4 items-start',
  'top-center':    'top-4 left-1/2 -translate-x-1/2 items-center',
  'top-right':     'top-4 right-4 items-end',
  'bottom-left':   'bottom-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right':  'bottom-4 right-4 items-end',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const duration = item.duration ?? 4000;
  const color = COLORS[item.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());
  const remainingRef = useRef(duration);
  const [progress, setProgress] = useState(100);
  const rafRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismiss(item.id), remainingRef.current);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, ((remainingRef.current - elapsed) / duration) * 100);
      setProgress(pct);
      if (pct > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, item.id, onDismiss]);

  const pauseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    remainingRef.current -= Date.now() - startRef.current;
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startTimer]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className="relative w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-slide-down"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={cn('shrink-0 mt-0.5', color.icon)} aria-hidden="true">
          {ICONS[item.variant]}
        </span>
        <div className="flex-1 min-w-0">
          {item.title && (
            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          )}
          <p className={cn('text-sm text-gray-600', item.title && 'mt-0.5')}>{item.message}</p>
          {item.action && (
            <button
              type="button"
              onClick={() => { item.action!.onClick(); onDismiss(item.id); }}
              className="mt-1.5 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark underline-offset-2 hover:underline"
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="shrink-0 -mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
        <div
          className={cn('h-full transition-none', color.progress)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<ToastItem, 'id'>): string => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => {
        const next = [{ ...options, id }, ...prev];
        return next.slice(0, maxToasts);
      });
      return id;
    },
    [maxToasts],
  );

  const make =
    (variant: ToastVariant) =>
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'variant' | 'message'>>) =>
      toast({ variant, message, ...options });

  const value: ToastContextValue = {
    toast,
    dismiss,
    success: make('success'),
    error: make('error'),
    warning: make('warning'),
    info: make('info'),
  };

  const isBottom = position.startsWith('bottom');

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="false"
            className={cn(
              'fixed z-[99999] flex flex-col gap-2 w-full max-w-sm pointer-events-none',
              POSITIONS[position],
              isBottom && 'flex-col-reverse',
            )}
          >
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto w-full">
                <ToastCard item={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

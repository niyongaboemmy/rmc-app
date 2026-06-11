'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode | false;
}

const CONFIG: Record<
  AlertVariant,
  { wrapper: string; iconWrapper: string; title: string; body: string; dismiss: string; defaultIcon: ReactNode }
> = {
  error: {
    wrapper: 'bg-red-50 border border-red-200',
    iconWrapper: 'text-red-500',
    title: 'text-red-800',
    body: 'text-red-700',
    dismiss: 'text-red-400 hover:text-red-600 hover:bg-red-100',
    defaultIcon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    wrapper: 'bg-green-50 border border-green-200',
    iconWrapper: 'text-green-500',
    title: 'text-green-800',
    body: 'text-green-700',
    dismiss: 'text-green-400 hover:text-green-600 hover:bg-green-100',
    defaultIcon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    wrapper: 'bg-yellow-50 border border-yellow-200',
    iconWrapper: 'text-yellow-500',
    title: 'text-yellow-800',
    body: 'text-yellow-700',
    dismiss: 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100',
    defaultIcon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    wrapper: 'bg-blue-50 border border-blue-200',
    iconWrapper: 'text-blue-500',
    title: 'text-blue-800',
    body: 'text-blue-700',
    dismiss: 'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
    defaultIcon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export function Alert({
  variant = 'error',
  title,
  message,
  children,
  className,
  dismissible = false,
  onDismiss,
  icon,
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const cfg = CONFIG[variant];

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const showIcon = icon !== false;
  const renderedIcon = icon !== false && icon !== undefined ? icon : cfg.defaultIcon;
  const content = children ?? message;

  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-xl px-4 py-3', cfg.wrapper, className)}
    >
      {showIcon && (
        <span className={cn('shrink-0 mt-0.5', cfg.iconWrapper)} aria-hidden="true">
          {renderedIcon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('text-sm font-semibold', cfg.title)}>{title}</p>
        )}
        {content && (
          <div className={cn('text-sm', title ? 'mt-0.5' : '', cfg.body)}>
            {content}
          </div>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'shrink-0 -mt-0.5 -mr-1 p-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
            cfg.dismiss,
          )}
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

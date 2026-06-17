'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || 'checkbox';

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="flex items-center gap-2.5 cursor-pointer select-none group">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            className={cn(
              'w-4 h-4 rounded border-gray-300 text-rmc-green',
              'focus:ring-2 focus:ring-rmc-green focus:ring-offset-1',
              'cursor-pointer transition-colors',
              error && 'border-red-400',
              className,
            )}
            {...props}
          />
          {label && (
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="text-xs text-red-600 ml-6">{error}</p>
        )}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

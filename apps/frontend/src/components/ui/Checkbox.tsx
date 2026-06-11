'use client';

import { InputHTMLAttributes, forwardRef, useId, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, indeterminate, disabled, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const node = innerRef.current;
      if (node) node.indeterminate = indeterminate ?? false;
    }, [indeterminate]);

    const setRefs = (node: HTMLInputElement | null) => {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label
          htmlFor={inputId}
          className={cn(
            'inline-flex items-start gap-2.5',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <div className="relative flex items-center mt-0.5 shrink-0">
            <input
              ref={setRefs}
              id={inputId}
              type="checkbox"
              disabled={disabled}
              className={cn(
                'peer h-4 w-4 appearance-none rounded border-2 transition-all duration-150',
                'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rmc-green focus-visible:outline-none',
                'checked:bg-rmc-green checked:border-rmc-green',
                error ? 'border-red-400' : 'border-gray-300 hover:border-rmc-green',
              )}
              {...props}
            />
            <svg
              className="pointer-events-none absolute inset-0 hidden h-4 w-4 peer-checked:block text-white"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              {indeterminate ? (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 8h8" />
              ) : (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4" />
              )}
            </svg>
          </div>

          {(label || description) && (
            <div>
              {label && (
                <span className="block text-sm font-medium text-gray-700 select-none">{label}</span>
              )}
              {description && (
                <span className="block text-xs text-gray-500 select-none">{description}</span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1 ml-6">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, error, disabled, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

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
              ref={ref}
              id={inputId}
              type="radio"
              disabled={disabled}
              className={cn(
                'peer h-4 w-4 appearance-none rounded-full border-2 transition-all duration-150',
                'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rmc-green focus-visible:outline-none',
                'checked:border-rmc-green',
                error ? 'border-red-400' : 'border-gray-300 hover:border-rmc-green',
              )}
              {...props}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-rmc-green scale-0 peer-checked:scale-100 transition-transform duration-150" />
            </div>
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
Radio.displayName = 'Radio';

interface RadioGroupProps {
  legend?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({ legend, error, children, className }: RadioGroupProps) {
  return (
    <fieldset className={cn('space-y-2', className)}>
      {legend && (
        <legend className="text-sm font-medium text-gray-700 mb-2">{legend}</legend>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </fieldset>
  );
}

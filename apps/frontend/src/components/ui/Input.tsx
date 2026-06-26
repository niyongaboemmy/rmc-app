'use client';

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  inputSize?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

const INPUT_SIZES: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3.5 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      required,
      inputSize = 'md',
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasLeftPad = leftIcon || leftAddon;
    const hasRightPad = rightIcon || rightAddon;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5 select-none"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-stretch">
          {leftAddon && (
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm select-none">
              {leftAddon}
            </span>
          )}

          {leftIcon && !leftAddon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full border rounded-lg transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent',
              'placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              INPUT_SIZES[inputSize],
              hasLeftPad && !leftAddon && 'pl-9',
              hasRightPad && !rightAddon && 'pr-9',
              leftAddon && 'rounded-l-none',
              rightAddon && 'rounded-r-none',
              error
                ? 'border-red-400 bg-red-50 focus:ring-red-400'
                : 'border-gray-300 bg-white hover:border-gray-400',
              className,
            )}
            {...props}
          />

          {rightIcon && !rightAddon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
              {rightIcon}
            </span>
          )}

          {rightAddon && (
            <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm select-none">
              {rightAddon}
            </span>
          )}
        </div>

        {hint && !error && (
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
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
Input.displayName = 'Input';

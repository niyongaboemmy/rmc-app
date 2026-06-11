'use client';

import { SelectHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  leftIcon?: ReactNode;
  selectSize?: SelectSize;
}

const SIZE: Record<SelectSize, string> = {
  sm: 'py-1.5 text-xs',
  md: 'py-2.5 text-sm',
  lg: 'py-3.5 text-base',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      required,
      options,
      placeholder,
      leftIcon,
      selectSize = 'md',
      disabled,
      children,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const genId = useId();
    const inputId = id ?? genId;

    // Detect whether a real value is chosen (not the placeholder)
    const hasValue =
      value !== undefined
        ? value !== '' && value !== null
        : defaultValue !== undefined && defaultValue !== '';

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5 select-none"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative group">
          {/* Left icon */}
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              {leftIcon}
            </span>
          )}

          {/* Native select — fully styled wrapper hides OS chrome */}
          <select
            id={inputId}
            ref={ref}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            className={cn(
              // Reset & base
              'peer w-full appearance-none bg-white cursor-pointer',
              'border rounded-xl transition-all duration-200',
              // Padding
              'pl-4 pr-10',
              leftIcon && 'pl-10',
              SIZE[selectSize],
              // Typography — weight lifts when a value is chosen
              'font-medium text-gray-900',
              !hasValue && 'text-gray-400 font-normal',
              // Default state
              !error && !disabled &&
                'border-gray-300 hover:border-rmc-green/60 hover:shadow-sm',
              // Focus
              'focus:outline-none focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/15 focus:shadow-sm',
              // Error
              error && 'border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-400',
              // Disabled
              disabled &&
                'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden={false}>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom chevron — animated on focus */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2',
              'flex items-center justify-center w-5 h-5 rounded-md transition-all duration-200',
              // Tint the icon container on peer-focus
              'peer-focus:bg-rmc-green-light peer-focus:text-rmc-green',
              disabled ? 'text-gray-300' : error ? 'text-red-400' : 'text-gray-400 group-hover:text-gray-600',
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              />
            </svg>
          </span>
        </div>

        {/* Hint */}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        )}

        {/* Error */}
        {error && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

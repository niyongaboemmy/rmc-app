'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

type SwitchSize = 'sm' | 'md' | 'lg';
type SwitchColor = 'green' | 'blue' | 'gold';

interface SwitchToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  description?: string;
  switchSize?: SwitchSize;
  color?: SwitchColor;
  labelPosition?: 'left' | 'right';
}

const TRACK_SIZES: Record<SwitchSize, string> = {
  sm: 'w-8 h-4',
  md: 'w-11 h-6',
  lg: 'w-14 h-7',
};

const THUMB_SIZES: Record<SwitchSize, string> = {
  sm: 'h-3 w-3 top-0.5 left-0.5',
  md: 'h-4 w-4 top-1 left-1',
  lg: 'h-5 w-5 top-1 left-1',
};

const THUMB_TRANSLATE: Record<SwitchSize, string> = {
  sm: 'peer-checked:translate-x-4',
  md: 'peer-checked:translate-x-5',
  lg: 'peer-checked:translate-x-7',
};

const TRACK_COLORS: Record<SwitchColor, string> = {
  green: 'peer-checked:bg-rmc-green',
  blue: 'peer-checked:bg-blue-500',
  gold: 'peer-checked:bg-rmc-gold',
};

export const SwitchToggle = forwardRef<HTMLInputElement, SwitchToggleProps>(
  (
    {
      label,
      description,
      switchSize = 'md',
      color = 'green',
      labelPosition = 'right',
      disabled,
      id,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const labelEl = (label || description) && (
      <div className="flex flex-col">
        {label && (
          <span
            className={cn(
              'text-sm font-medium select-none',
              disabled ? 'text-gray-400' : 'text-gray-700',
            )}
          >
            {label}
          </span>
        )}
        {description && (
          <span className={cn('text-xs', disabled ? 'text-gray-300' : 'text-gray-500')}>
            {description}
          </span>
        )}
      </div>
    );

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        {labelPosition === 'left' && labelEl}

        <div className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'rounded-full bg-gray-200 transition-colors duration-200 ease-in-out',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-rmc-green',
              TRACK_SIZES[switchSize],
              TRACK_COLORS[color],
            )}
          />
          <div
            className={cn(
              'absolute rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
              THUMB_SIZES[switchSize],
              THUMB_TRANSLATE[switchSize],
            )}
          />
        </div>

        {labelPosition === 'right' && labelEl}
      </label>
    );
  },
);
SwitchToggle.displayName = 'SwitchToggle';

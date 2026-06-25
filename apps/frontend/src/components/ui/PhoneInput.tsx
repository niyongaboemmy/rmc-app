'use client';

import { InputHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ── Helpers (exported for forms that need E.164 before submitting) ─────────────

/** 07XXXXXXXX  →  +250XXXXXXXX  (no-op if already E.164 or empty) */
export function toE164(local: string): string {
  if (!local) return local;
  const digits = local.replace(/\D/g, '');
  if (digits.startsWith('250')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+250${digits.slice(1)}`;
  return `+250${digits}`;
}

/** +250XXXXXXXX  →  07XXXXXXXX  (no-op if already local or empty) */
export function toLocalPhone(e164?: string | null): string {
  if (!e164) return '';
  if (e164.startsWith('+250')) return '0' + e164.slice(4);
  if (e164.startsWith('250'))  return '0' + e164.slice(3);
  return e164;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'maxLength'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Rwanda phone number input.
 *
 * - Displays a 🇷🇼 +250 prefix badge (non-editable)
 * - User types the local format: 07XXXXXXXX (10 digits)
 * - Auto-strips non-digit characters
 * - Auto-converts pasted E.164 (+250...) to local 07... format
 * - Max 10 characters
 * - Compatible with react-hook-form `{...register('phone')}` and
 *   controlled `value / onChange` patterns
 *
 * The stored value is always in local format (07XXXXXXXX).
 * Use `toE164(value)` before sending to the backend.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, label, error, hint, id, required, onChange, onBlur, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'phone';

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;

        // If user pasted an E.164 number, convert to local first
        if (raw.startsWith('+250') || raw.startsWith('250')) {
          raw = toLocalPhone(raw);
        }

        // Keep only digits, max 10
        const clean = raw.replace(/\D/g, '').slice(0, 10);

        // Mutate the synthetic event value so react-hook-form gets the cleaned value
        Object.defineProperty(e, 'target', {
          writable: false,
          value: { ...e.target, value: clean },
        });

        onChange?.(e);
      },
      [onChange],
    );

    const isError = Boolean(error);

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
          {/* Flag + code addon */}
          <span className="inline-flex items-center gap-1.5 px-3 rounded-l-lg border border-r-0 bg-gray-50 text-gray-600 text-sm font-medium select-none whitespace-nowrap shrink-0 border-gray-300">
            <span className="text-base leading-none" aria-hidden="true">🇷🇼</span>
            <span className="text-xs font-semibold text-gray-500">+250</span>
          </span>

          <input
            id={inputId}
            ref={ref}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="07XXXXXXXX"
            autoComplete="tel"
            onChange={handleChange}
            onBlur={onBlur}
            className={cn(
              'w-full border rounded-r-lg rounded-l-none transition-colors duration-200',
              'px-4 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent',
              'placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              isError
                ? 'border-red-400 bg-red-50 focus:ring-red-400'
                : 'border-gray-300 bg-white hover:border-gray-400',
              className,
            )}
            {...props}
          />
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
PhoneInput.displayName = 'PhoneInput';

'use client';

import { InputHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ── Helpers (exported for forms that need E.164 before submitting) ─────────────

/**
 * National number (7XXXXXXXX) → +250XXXXXXXX. Tolerant of any input form
 * (with/without +250, with/without a leading 0, spaces): the country code is
 * always added for storage. No-op when empty.
 */
export function toE164(local: string): string {
  if (!local) return local;
  let digits = local.replace(/\D/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (digits.startsWith('0'))   digits = digits.slice(1);
  return digits ? `+250${digits}` : '';
}

/**
 * Anything (+250XXXXXXXX, 250…, 0…, with spaces) → the 9-digit national number
 * (7XXXXXXXX) used inside the input, beside the +250 badge. No leading 0.
 */
export function toLocalPhone(e164?: string | null): string {
  if (!e164) return '';
  let digits = e164.replace(/\D/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (digits.startsWith('0'))   digits = digits.slice(1);
  return digits.slice(0, 9);
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
 * - User types the national number beside it: 7XXXXXXXX (9 digits)
 * - Auto-strips non-digit characters, a pasted +250/250 country code, AND a
 *   redundant leading 0 (so "+250 0780313448" and "0780313448" both become
 *   "780313448")
 * - Max 9 digits
 * - Compatible with react-hook-form `{...register('phone')}` and
 *   controlled `value / onChange` patterns
 *
 * The field value is the 9-digit national number (7XXXXXXXX).
 * Use `toE164(value)` before sending to the backend to store with +250.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, label, error, hint, id, required, onChange, onBlur, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'phone';

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Normalise to the 9-digit national number: drop non-digits, a pasted
        // +250/250 country code, and a redundant leading 0 (the +250 badge
        // already supplies the country code).
        let digits = e.target.value.replace(/\D/g, '');
        if (digits.startsWith('250')) digits = digits.slice(3);
        if (digits.startsWith('0')) digits = digits.slice(1);
        const clean = digits.slice(0, 9);

        // Write the cleaned value back to the actual input so the displayed
        // value and the value react-hook-form validates stay in sync.
        e.target.value = clean;
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
            placeholder="7XXXXXXXX"
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

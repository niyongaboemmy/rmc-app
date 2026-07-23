'use client';

import { type InputHTMLAttributes, type ReactNode } from 'react';

// Canonical control styling — identical to the shared <Input> primitive so
// funeral forms match the rest of the app's design system.
const inputClass =
  'w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm text-gray-900 transition-colors duration-200 hover:border-gray-400 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

/** Labelled text/number input used across the funeral admin forms. */
export function Field({
  label,
  hint,
  className,
  required,
  ...props
}: { label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input className={inputClass} required={required} {...props} />
      {hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

'use client';

import { type InputHTMLAttributes, type ReactNode } from 'react';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green disabled:bg-gray-50';

/** Labelled text/number input used across the funeral admin forms. */
export function Field({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

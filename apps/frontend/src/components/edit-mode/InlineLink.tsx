'use client';

/**
 * Compact URL field for in-context Edit Mode.
 *
 * Used for link targets that aren't visible as text on the page (e.g. a partner's
 * website, which is otherwise only reachable by clicking the card). A section
 * renders this only while editing, so the public site is unaffected. It is a
 * plain controlled input styled as a dashed pill; edits flow up via `onChange`.
 */

import React from 'react';
import { Link2 } from 'lucide-react';

interface InlineLinkProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineLink({
  value,
  onChange,
  placeholder = 'https://…',
  className = '',
}: InlineLinkProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed border-rmc-green/40 bg-rmc-green/5 px-2 py-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Link2 className="h-3 w-3 shrink-0 text-rmc-green" />
      <input
        type="url"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-40 bg-transparent text-[11px] text-gray-700 placeholder-gray-400 focus:outline-none"
      />
    </span>
  );
}

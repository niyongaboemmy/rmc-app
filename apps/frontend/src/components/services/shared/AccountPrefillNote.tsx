'use client';

import { UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sits above a form whose fields were filled in from the signed-in account, so
 * nobody submits their own name and number without noticing they were filled in
 * for them — and so it's clear they may be changed.
 *
 * The wording is the caller's: each service owns its own translation namespace.
 */
export function AccountPrefillNote({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-rmc-green/20 bg-rmc-green-light/40 px-3.5 py-2.5',
        className,
      )}
    >
      <UserCircle2 className="mt-px h-4 w-4 shrink-0 text-rmc-green" />
      <p className="text-xs leading-relaxed text-rmc-green-dark">{text}</p>
    </div>
  );
}

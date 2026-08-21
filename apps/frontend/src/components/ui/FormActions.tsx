import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormActionsProps {
  children: ReactNode;
  /** Render a top divider (border + spacing) above the actions. Default true. */
  divided?: boolean;
  /** Stack the actions vertically on mobile, side-by-side from `sm`. Default true. */
  stackOnMobile?: boolean;
  className?: string;
}

/**
 * Standard action bar for form and modal footers — lays out the submit/cancel
 * buttons consistently across the admin. Buttons are passed as children
 * (typically with `flex-1` for equal-width layouts).
 */
export function FormActions({
  children,
  divided = true,
  stackOnMobile = true,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        stackOnMobile ? 'flex-col sm:flex-row sm:justify-end' : 'flex-row justify-end',
        divided && 'mt-6 pt-5 border-t border-gray-100',
        className,
      )}
    >
      {children}
    </div>
  );
}

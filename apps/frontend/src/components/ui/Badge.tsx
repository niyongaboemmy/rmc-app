import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-rmc-green/10 text-rmc-green',
  success: 'bg-green-100 text-green-700',
  error:   'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info:    'bg-blue-100 text-blue-700',
  outline: 'bg-transparent border border-gray-300 text-gray-600',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  active:    'success',
  inactive:  'default',
  suspended: 'error',
  pending:   'warning',
  verified:  'success',
  banned:    'error',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_MAP[status.toLowerCase()] ?? 'default';
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {status}
    </Badge>
  );
}

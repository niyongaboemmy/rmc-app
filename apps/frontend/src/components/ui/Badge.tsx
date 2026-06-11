import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'outline';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default:  'bg-gray-100 text-gray-700',
  primary:  'bg-rmc-green-light text-rmc-green-dark',
  success:  'bg-green-100 text-green-700',
  error:    'bg-red-100 text-red-700',
  warning:  'bg-yellow-100 text-yellow-700',
  info:     'bg-blue-100 text-blue-700',
  outline:  'bg-transparent border border-gray-300 text-gray-600',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default:  'bg-gray-500',
  primary:  'bg-rmc-green',
  success:  'bg-green-500',
  error:    'bg-red-500',
  warning:  'bg-yellow-500',
  info:     'bg-blue-500',
  outline:  'bg-gray-400',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_COLORS[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  active:    'success',
  pending:   'warning',
  suspended: 'error',
  inactive:  'default',
  approved:  'success',
  rejected:  'error',
  draft:     'default',
  published: 'primary',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_MAP[status.toLowerCase()] ?? 'default';
  return (
    <Badge variant={variant} dot className={className}>
      {status}
    </Badge>
  );
}

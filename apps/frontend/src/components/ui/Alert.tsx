import { cn } from '@/lib/utils';

interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

const VARIANTS = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export function Alert({ variant = 'error', message, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'px-4 py-3 rounded-lg border text-sm font-medium',
        VARIANTS[variant],
        className,
      )}
    >
      {message}
    </div>
  );
}

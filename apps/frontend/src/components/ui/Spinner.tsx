import { cn } from '@/lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerColor = 'green' | 'white' | 'gray' | 'gold';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string;
  className?: string;
}

const SIZES: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
};

const COLORS: Record<SpinnerColor, string> = {
  green: 'border-rmc-green/20 border-t-rmc-green',
  white: 'border-white/30 border-t-white',
  gray:  'border-gray-200 border-t-gray-600',
  gold:  'border-rmc-gold/20 border-t-rmc-gold',
};

export function Spinner({ size = 'md', color = 'green', label = 'Loading…', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex flex-col items-center gap-2', className)}>
      <span
        className={cn(
          'animate-spin rounded-full',
          SIZES[size],
          COLORS[color],
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface PageSpinnerProps {
  label?: string;
}

export function PageSpinner({ label = 'Loading…' }: PageSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" label={label} />
    </div>
  );
}

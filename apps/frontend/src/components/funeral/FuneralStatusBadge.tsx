import { Check, Loader2, Clock } from 'lucide-react';
import type { TimelineStep } from './types';

type Status = TimelineStep['status'];

/** Small pill describing a timeline step's status. Presentational — server-safe. */
export function FuneralStatusBadge({ status, label }: { status: Status; label: string }) {
  const styles: Record<Status, string> = {
    done: 'bg-rmc-green/10 text-rmc-green',
    active: 'bg-amber-50 text-amber-600',
    pending: 'bg-gray-100 text-gray-400',
  };
  const Icon = status === 'done' ? Check : status === 'active' ? Loader2 : Clock;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${styles[status]}`}>
      <Icon className={`h-3 w-3 ${status === 'active' ? 'animate-spin' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
}

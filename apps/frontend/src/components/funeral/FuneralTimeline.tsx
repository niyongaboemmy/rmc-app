import { Check } from 'lucide-react';
import type { TimelineStep, FuneralStage } from './types';
import { FuneralStatusBadge } from './FuneralStatusBadge';
import { stepIcon } from './stepIcons';

interface Labels {
  stages: Record<FuneralStage, string>;
  descriptions?: Partial<Record<FuneralStage, string>>;
  colors?: Partial<Record<FuneralStage, string>>;
  icons?: Partial<Record<FuneralStage, string>>;
  status: { done: string; active: string; pending: string };
}

/** Vertical funeral progress timeline. Presentational — server-safe. */
export function FuneralTimeline({
  steps,
  labels,
  locale,
}: {
  steps: TimelineStep[];
  labels: Labels;
  locale: string;
}) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const accent = labels.colors?.[step.stage];
        const Icon = stepIcon(labels.icons?.[step.stage]);
        const filled = step.status === 'done' || step.status === 'active';
        // Custom accent colours the filled (done/active) node; pending stays muted.
        const nodeClass = filled
          ? `text-white ring-black/5 ${step.status === 'active' ? 'animate-pulse' : ''} ${!accent ? (step.status === 'done' ? 'bg-rmc-green ring-rmc-green/20' : 'bg-amber-500 ring-amber-200') : ''}`
          : 'bg-white text-gray-300 ring-gray-200';
        const nodeStyle = filled && accent ? { backgroundColor: accent } : undefined;

        return (
          <li key={step.stage} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 bottom-0 w-px ${step.status === 'done' ? 'bg-rmc-green/30' : 'bg-gray-200'}`}
                aria-hidden="true"
              />
            )}

            {/* Node */}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ${nodeClass}`} style={nodeStyle}>
              {step.status === 'done' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : Icon ? (
                <Icon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <span className="text-[11px] font-bold tabular-nums">{i + 1}</span>
              )}
            </span>

            {/* Content */}
            <div className={`min-w-0 flex-1 rounded-2xl border p-4 transition-colors ${
              step.status === 'active' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`text-[14px] font-bold ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                  {labels.stages[step.stage]}
                </h3>
                <FuneralStatusBadge status={step.status} label={labels.status[step.status]} />
              </div>

              {labels.descriptions?.[step.stage] && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{labels.descriptions[step.stage]}</p>
              )}

              {step.timestamp && (
                <p className="mt-1 text-[12px] tabular-nums text-gray-400">
                  {new Date(step.timestamp).toLocaleString(locale, {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}

              {step.notes && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{step.notes}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

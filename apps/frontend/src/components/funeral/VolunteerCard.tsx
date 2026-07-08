import { Phone, CheckCircle2, Clock, UserPlus, RefreshCw, X, Pencil, Trash2, Landmark } from 'lucide-react';
import type { Volunteer, VolunteerTask } from './types';

interface Labels {
  skills: string;
  available: string;
  busy: string;
  assignedTask: string;
  assign: string;
  reassign: string;
  unassign: string;
  edit: string;
  delete: string;
  forFuneral: string;
  taskLabel: (task: VolunteerTask) => string;
}

/**
 * Volunteer roster card with an assign/reassign control. Presentational —
 * the parent client component owns the assign state and passes handlers.
 */
export function VolunteerCard({
  volunteer,
  labels,
  mosqueName,
  assignedFuneralLabel,
  onAssign,
  onUnassign,
  onEdit,
  onDelete,
  canManage = true,
}: {
  volunteer: Volunteer;
  labels: Labels;
  mosqueName?: string;
  assignedFuneralLabel?: string;
  onAssign?: () => void;
  onUnassign?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}) {
  const assigned = !!volunteer.assignedTask;
  const initials = volunteer.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rmc-green-light text-sm font-bold text-rmc-green ring-1 ring-rmc-green/15" aria-hidden="true">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-gray-900">{volunteer.name}</h3>
          <a href={`tel:${volunteer.phone.replace(/\s+/g, '')}`} className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-rmc-green">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="tabular-nums">{volunteer.phone}</span>
          </a>
          {mosqueName && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-gray-400">
              <Landmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{mosqueName}</span>
            </p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
          assigned ? 'bg-amber-50 text-amber-600' : 'bg-rmc-green/10 text-rmc-green'
        }`}>
          {assigned ? <Clock className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
          {assigned ? labels.busy : labels.available}
        </span>
      </div>

      {/* Skills */}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{labels.skills}</p>
        <div className="flex flex-wrap gap-1.5">
          {volunteer.skills.map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
              {labels.taskLabel(s)}
            </span>
          ))}
        </div>
      </div>

      {/* Assigned task + funeral */}
      {assigned && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">{labels.assignedTask}:</span>
            <span className="text-[13px] font-bold text-amber-800">{labels.taskLabel(volunteer.assignedTask as VolunteerTask)}</span>
          </div>
          {assignedFuneralLabel && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">{labels.forFuneral}:</span>
              <span className="truncate text-[13px] font-bold text-amber-800">{assignedFuneralLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {canManage && (
      <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3">
        <button
          type="button"
          onClick={onAssign}
          className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
        >
          {assigned ? <RefreshCw className="h-3 w-3" aria-hidden="true" /> : <UserPlus className="h-3 w-3" aria-hidden="true" />}
          {assigned ? labels.reassign : labels.assign}
        </button>
        {assigned && (
          <button
            type="button"
            onClick={onUnassign}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-[12px] font-semibold text-gray-500 transition-colors hover:border-red-300 hover:text-red-600"
          >
            <X className="h-3 w-3" aria-hidden="true" /> {labels.unassign}
          </button>
        )}
        {(onEdit || onDelete) && (
          <div className="ms-auto flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={labels.edit}
                title={labels.edit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={labels.delete}
                title={labels.delete}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

import { Phone, CheckCircle2, Clock, Landmark } from 'lucide-react';
import type { Volunteer, VolunteerTask } from './types';

interface Labels {
  skills: string;
  available: string;
  busy: string;
  taskLabel: (task: VolunteerTask) => string;
}

/**
 * Read-only volunteer card for the public funeral site. Presentational and
 * informative only — no assign / reassign / management controls. The admin
 * dashboard uses the separate, interactive VolunteerCard instead.
 */
export function PublicVolunteerCard({ volunteer, labels, mosqueName }: { volunteer: Volunteer; labels: Labels; mosqueName?: string }) {
  const assigned = !!volunteer.assignedTask;
  const initials = volunteer.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
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
    </div>
  );
}

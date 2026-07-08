'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, UserPlus, X, Users } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { type FuneralRequest, type FuneralStepConfig, type Volunteer, type VolunteerTask } from './types';

/**
 * Manage a funeral request: update its lifecycle stage and manage the attendants
 * (volunteers) assigned to it. Stage changes rebuild the timeline on save;
 * attendant assign/remove take effect immediately via the parent handlers.
 */
export function RequestStageDialog({
  request,
  steps,
  attendants,
  availableVolunteers,
  stageLabel,
  taskLabel,
  canManage = true,
  onSave,
  onAssignAttendant,
  onUnassignAttendant,
  onClose,
}: {
  request: FuneralRequest;
  steps: FuneralStepConfig[];
  attendants: Volunteer[];
  availableVolunteers: Volunteer[];
  stageLabel: (s: string) => string;
  taskLabel: (t: VolunteerTask) => string;
  canManage?: boolean;
  onSave: (stage: string) => void;
  onAssignAttendant: (volunteerId: string, task: VolunteerTask) => void;
  onUnassignAttendant: (volunteerId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.funeral.requests.dialog');
  const [stage, setStage] = useState<string>(request.stage);
  const currentIdx = steps.findIndex((s) => s.key === request.stage);

  // "Add attendant" row state.
  const [picking, setPicking] = useState(false);
  const [volunteerId, setVolunteerId] = useState('');
  const [task, setTask] = useState<VolunteerTask>('ghusl');

  const selectedVolunteer = availableVolunteers.find((v) => v.id === volunteerId);

  const openPicker = () => {
    const first = availableVolunteers[0];
    setVolunteerId(first?.id ?? '');
    setTask(first?.skills[0] ?? 'ghusl');
    setPicking(true);
  };

  const confirmAdd = () => {
    if (!volunteerId) return;
    onAssignAttendant(volunteerId, task);
    setPicking(false);
  };

  return (
    <FuneralModal
      title={t('title')}
      subtitle={`${request.deceased.fullName} · ${request.reference}`}
      onClose={onClose}
      closeLabel={t('cancel')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(stage)}
            disabled={stage === request.stage}
            className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> {t('save')}
          </button>
        </>
      }
    >
      {/* Stage */}
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('stageLabel')}</p>
      <div className="space-y-1.5">
        {steps.map((s, i) => {
          const done = currentIdx !== -1 && i < currentIdx;
          return (
            <label
              key={s.key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/40 has-[:checked]:font-semibold has-[:checked]:text-rmc-green-dark"
            >
              <input
                type="radio"
                name="request-stage"
                value={s.key}
                checked={stage === s.key}
                onChange={() => setStage(s.key)}
                className="accent-rmc-green"
              />
              {s.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />}
              <span className="flex-1">{stageLabel(s.key)}</span>
              {done && <Check className="h-3.5 w-3.5 text-rmc-green/60" aria-hidden="true" />}
              {s.key === request.stage && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                  {t('current')}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Attendants */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> {t('attendants', { count: attendants.length })}
        </p>
        {canManage && !picking && (
          <button
            type="button"
            onClick={openPicker}
            disabled={availableVolunteers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-rmc-green/40 px-3 py-1 text-[12px] font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> {t('addAttendant')}
          </button>
        )}
      </div>

      {/* Add-attendant picker */}
      {picking && (
        <div className="mt-2 space-y-2 rounded-xl border border-rmc-green/30 bg-rmc-green-light/30 p-3">
          <select
            value={volunteerId}
            onChange={(e) => {
              setVolunteerId(e.target.value);
              const v = availableVolunteers.find((x) => x.id === e.target.value);
              if (v) setTask(v.skills[0] ?? 'ghusl');
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          >
            {availableVolunteers.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={task}
            onChange={(e) => setTask(e.target.value as VolunteerTask)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          >
            {(selectedVolunteer?.skills ?? []).map((s) => (
              <option key={s} value={s}>{taskLabel(s)}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmAdd}
              disabled={!volunteerId}
              className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-4 py-1.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> {t('add')}
            </button>
          </div>
        </div>
      )}

      {attendants.length === 0 ? (
        !picking && <p className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center text-[13px] text-gray-400">{t('noAttendants')}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {attendants.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[11px] font-bold text-rmc-green">
                {v.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-gray-900">{v.name}</p>
                {v.assignedTask && <p className="truncate text-[11px] text-gray-400">{taskLabel(v.assignedTask)}</p>}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onUnassignAttendant(v.id)}
                  aria-label={t('removeAttendant')}
                  title={t('removeAttendant')}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </FuneralModal>
  );
}

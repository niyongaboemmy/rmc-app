'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Users, Check, Plus } from 'lucide-react';
import { pickStep } from './stepLabels';
import type { Volunteer, VolunteerTask, FuneralOption, FuneralSkillConfig } from './types';
import { VolunteerCard } from './VolunteerCard';
import { EmptyState } from './EmptyState';
import { FuneralModal } from './FuneralModal';
import { FuneralToast } from './FuneralToast';
import { VolunteerFormDialog } from './VolunteerFormDialog';
import { ConfirmDialog } from './ConfirmDialog';

type Filter = 'all' | 'available' | 'busy';

/**
 * Volunteer roster + assignment UI. Controlled by the parent so assignments
 * feed back into the shared stats/reports; when `canManage` is false the roster
 * is read-only. Roster CRUD (add / edit / remove attendants) is enabled only
 * when the matching handlers are supplied.
 */
export function VolunteerManagement({
  volunteers,
  funerals,
  skills,
  onAssign,
  onUnassign,
  onSaveVolunteer,
  onDeleteVolunteer,
  canManage = true,
}: {
  volunteers: Volunteer[];
  funerals: FuneralOption[];
  skills: FuneralSkillConfig[];
  onAssign: (id: string, task: VolunteerTask, requestId: string) => void;
  onUnassign: (id: string) => void;
  onSaveVolunteer?: (v: Volunteer) => void;
  onDeleteVolunteer?: (id: string) => void;
  canManage?: boolean;
}) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.funeral.volunteers');

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mosqueFilter, setMosqueFilter] = useState('');
  const [assigning, setAssigning] = useState<Volunteer | null>(null);
  const [choice, setChoice] = useState<VolunteerTask>('');
  const [funeralChoice, setFuneralChoice] = useState('');
  const [editing, setEditing] = useState<{ open: boolean; initial?: Volunteer }>({ open: false });
  const [removing, setRemoving] = useState<Volunteer | null>(null);
  const [toast, setToast] = useState('');

  const canEditRoster = canManage && !!onSaveVolunteer;
  const canDeleteRoster = canManage && !!onDeleteVolunteer;

  const funeralLabel = (id?: string) => {
    const f = funerals.find((x) => x.id === id);
    return f ? f.deceasedName : '';
  };
  // Mosque filter options, derived from the volunteers themselves.
  const mosqueOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of volunteers) if (v.mosqueId) map.set(v.mosqueId, v.mosqueName ?? '');
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [volunteers]);

  const skillByKey = new Map(skills.map((s) => [s.key, s]));
  const taskLabel = (task: VolunteerTask) => { const s = skillByKey.get(task); return s ? pickStep(s.label, locale) : task; };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const openAssign = (v: Volunteer) => {
    setChoice(v.assignedTask ?? v.skills[0] ?? '');
    setFuneralChoice(v.assignedRequestId ?? funerals[0]?.id ?? '');
    setAssigning(v);
  };

  const confirmAssign = () => {
    if (!assigning || !funeralChoice) return;
    onAssign(assigning.id, choice, funeralChoice);
    setToast(t('toast.assigned', { name: assigning.name, task: taskLabel(choice), funeral: funeralLabel(funeralChoice) }));
    setAssigning(null);
  };

  const unassign = (v: Volunteer) => {
    onUnassign(v.id);
    setToast(t('toast.unassigned', { name: v.name }));
  };

  const saveVolunteer = (v: Volunteer) => {
    const isEdit = editing.initial != null;
    onSaveVolunteer?.(v);
    setToast(t(isEdit ? 'toast.updated' : 'toast.created', { name: v.name }));
    setEditing({ open: false });
  };

  const confirmRemove = () => {
    if (!removing) return;
    onDeleteVolunteer?.(removing.id);
    setToast(t('toast.deleted', { name: removing.name }));
    setRemoving(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return volunteers.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q)) return false;
      if (filter === 'available' && v.assignedTask) return false;
      if (filter === 'busy' && !v.assignedTask) return false;
      if (mosqueFilter && v.mosqueId !== mosqueFilter) return false;
      return true;
    });
  }, [volunteers, query, filter, mosqueFilter]);

  const cardLabels = {
    skills: t('skills'),
    available: t('available'),
    busy: t('busy'),
    assignedTask: t('assignedTask'),
    assign: t('assign'),
    reassign: t('reassign'),
    unassign: t('unassign'),
    edit: t('edit'),
    delete: t('delete'),
    forFuneral: t('forFuneral'),
    taskLabel,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'available', label: t('filterAvailable') },
    { key: 'busy', label: t('filterBusy') },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <div className="inline-flex self-start rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label={t('filterAll')}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                filter === f.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={mosqueFilter}
          onChange={(e) => setMosqueFilter(e.target.value)}
          aria-label={t('allMosques')}
          className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
        >
          <option value="">{t('allMosques')}</option>
          {mosqueOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {canEditRoster && (
          <button
            type="button"
            onClick={() => setEditing({ open: true })}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-rmc-green px-4 py-2 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> {t('add')}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t('emptyTitle')} message={t('emptyText')} />
      ) : (
        <>
          <p className="text-[13px] text-gray-400">{t('resultsCount', { count: filtered.length })}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VolunteerCard
                key={v.id}
                volunteer={v}
                labels={cardLabels}
                mosqueName={v.mosqueName}
                assignedFuneralLabel={funeralLabel(v.assignedRequestId)}
                canManage={canManage}
                onAssign={() => openAssign(v)}
                onUnassign={v.assignedTask ? () => unassign(v) : undefined}
                onEdit={canEditRoster ? () => setEditing({ open: true, initial: v }) : undefined}
                onDelete={canDeleteRoster ? () => setRemoving(v) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {/* Assign dialog */}
      {assigning && (
        <FuneralModal
          title={t('dialog.title')}
          subtitle={t('dialog.subtitle', { name: assigning.name })}
          onClose={() => setAssigning(null)}
          closeLabel={t('dialog.cancel')}
          footer={
            <>
              <button type="button" onClick={() => setAssigning(null)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                {t('dialog.cancel')}
              </button>
              <button type="button" onClick={confirmAssign} disabled={!funeralChoice} className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50">
                <Check className="h-4 w-4" aria-hidden="true" /> {t('dialog.confirm')}
              </button>
            </>
          }
        >
          {funerals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-[13px] text-gray-400">
              {t('dialog.noFunerals')}
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('dialog.funeralLabel')}</p>
              <select
                value={funeralChoice}
                onChange={(e) => setFuneralChoice(e.target.value)}
                className="mb-5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
              >
                {funerals.map((f) => (
                  <option key={f.id} value={f.id}>{f.deceasedName} · {f.reference}</option>
                ))}
              </select>

              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('dialog.taskLabel')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(assigning?.skills ?? []).map((task) => (
                  <label
                    key={task}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/40 has-[:checked]:font-semibold has-[:checked]:text-rmc-green-dark"
                  >
                    <input type="radio" name="assign-task" value={task} checked={choice === task} onChange={() => setChoice(task)} className="accent-rmc-green" />
                    {taskLabel(task)}
                  </label>
                ))}
              </div>
            </>
          )}
        </FuneralModal>
      )}

      {/* Add / edit attendant */}
      {editing.open && (
        <VolunteerFormDialog
          initial={editing.initial}
          onSave={saveVolunteer}
          onClose={() => setEditing({ open: false })}
        />
      )}

      {/* Remove attendant confirmation */}
      {removing && (
        <ConfirmDialog
          title={t('confirmTitle')}
          message={t('deleteConfirm', { name: removing.name })}
          confirmLabel={t('delete')}
          cancelLabel={t('dialog.cancel')}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}

      {/* Success toast */}
      <FuneralToast message={toast} />
    </div>
  );
}

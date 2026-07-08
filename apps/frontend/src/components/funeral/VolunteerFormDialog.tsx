'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { Field } from './Field';
import { pickStep } from './stepLabels';
import { funeralApi } from '@/lib/funeralApi';
import { mosqueApi } from '@/lib/mosqueApi';
import type { Volunteer, VolunteerTask, FuneralSkillConfig } from './types';

/** Create or edit a funeral attendant (volunteer roster entry). */
export function VolunteerFormDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: Volunteer;
  onSave: (v: Volunteer) => void;
  onClose: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const tf = useTranslations('services.funeral.volunteers.form');

  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [mosqueId, setMosqueId] = useState(initial?.mosqueId ?? '');
  const [mosques, setMosques] = useState<{ id: string; name: string }[]>([]);
  const [skillOptions, setSkillOptions] = useState<FuneralSkillConfig[]>([]);
  const [skills, setSkills] = useState<VolunteerTask[]>(initial?.skills ?? []);
  const [touched, setTouched] = useState(false);

  // Live skill options (admin-managed).
  useEffect(() => {
    let active = true;
    funeralApi.listSkills()
      .then((res) => { if (active) setSkillOptions(res); })
      .catch(() => { if (active) setSkillOptions([]); });
    return () => { active = false; };
  }, []);

  // Real mosques for the registration picker.
  useEffect(() => {
    let active = true;
    mosqueApi.list()
      .then((list) => {
        if (!active) return;
        const opts = list.filter((m) => m.status === 'active').map((m) => ({ id: m.id, name: m.name }));
        // Keep the current mosque selectable even if it's no longer active.
        if (initial?.mosqueId && !opts.some((o) => o.id === initial.mosqueId)) {
          opts.push({ id: initial.mosqueId, name: initial.mosqueName ?? initial.mosqueId });
        }
        setMosques(opts);
      })
      .catch(() => { if (active) setMosques([]); });
    return () => { active = false; };
  }, [initial]);

  const valid = name.trim() && mosqueId && skills.length > 0;

  const toggleSkill = (task: VolunteerTask) =>
    setSkills((prev) => (prev.includes(task) ? prev.filter((s) => s !== task) : [...prev, task]));

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    // Preserve an existing assignment (task + funeral) only if the attendant
    // still has that skill; a brand-new attendant starts available.
    const stillHasSkill = initial?.assignedTask && skills.includes(initial.assignedTask);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      mosqueId,
      skills,
      assignedTask: stillHasSkill ? initial!.assignedTask : undefined,
      assignedRequestId: stillHasSkill ? initial!.assignedRequestId : undefined,
      available: stillHasSkill ? false : true,
    });
  };

  return (
    <FuneralModal
      title={initial ? tf('editTitle') : tf('createTitle')}
      onClose={onClose}
      closeLabel={tf('cancel')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {tf('cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> {tf('save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label={tf('name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint={touched && !name.trim() ? <span className="text-red-500">{tf('required')}</span> : undefined}
        />
        <Field label={tf('phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">{tf('mosque')}</span>
          <select
            value={mosqueId}
            onChange={(e) => setMosqueId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          >
            <option value="" disabled>{tf('selectMosque')}</option>
            {mosques.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {touched && !mosqueId && <span className="mt-1 block text-[11px] text-red-500">{tf('required')}</span>}
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">{tf('skills')}</span>
          <div className="grid grid-cols-2 gap-2">
            {skillOptions.map((sk) => (
              <label
                key={sk.key}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/40 has-[:checked]:font-semibold has-[:checked]:text-rmc-green-dark"
              >
                <input
                  type="checkbox"
                  checked={skills.includes(sk.key)}
                  onChange={() => toggleSkill(sk.key)}
                  className="accent-rmc-green"
                />
                {pickStep(sk.label, locale)}
              </label>
            ))}
          </div>
          {touched && skills.length === 0 && <span className="mt-1 block text-[11px] text-red-500">{tf('required')}</span>}
        </div>
      </div>
    </FuneralModal>
  );
}

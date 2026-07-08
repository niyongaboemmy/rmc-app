'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { Field } from './Field';
import type { FuneralAnnouncement } from './types';

/** Convert an ISO datetime to the value a datetime-local input expects. */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Create or edit a public funeral announcement (janāzah notice). */
export function AnnouncementFormDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: FuneralAnnouncement;
  onSave: (a: FuneralAnnouncement) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.funeral.announcements.form');

  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [dateOfDeath, setDateOfDeath] = useState(initial?.dateOfDeath ?? '');
  const [janazahLocation, setJanazahLocation] = useState(initial?.janazahLocation ?? '');
  const [prayerTime, setPrayerTime] = useState(toLocalInput(initial?.prayerTime ?? ''));
  const [burialLocation, setBurialLocation] = useState(initial?.burialLocation ?? '');
  const [verse, setVerse] = useState(initial?.verse ?? '');
  const [touched, setTouched] = useState(false);

  const valid = name.trim() && prayerTime && janazahLocation.trim() && burialLocation.trim();

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      photoUrl: initial?.photoUrl,
      name: name.trim(),
      age: Number(age) || 0,
      dateOfDeath,
      janazahLocation: janazahLocation.trim(),
      prayerTime: new Date(prayerTime).toISOString(),
      burialLocation: burialLocation.trim(),
      verse: verse.trim() || undefined,
    });
  };

  return (
    <FuneralModal
      title={initial ? t('editTitle') : t('createTitle')}
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
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> {t('save')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t('name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-2"
          hint={touched && !name.trim() ? <span className="text-red-500">{t('required')}</span> : undefined}
        />
        <Field label={t('age')} type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
        <Field label={t('dateOfDeath')} type="date" value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} />
        <Field
          label={t('janazahLocation')}
          value={janazahLocation}
          onChange={(e) => setJanazahLocation(e.target.value)}
          className="col-span-2"
          hint={touched && !janazahLocation.trim() ? <span className="text-red-500">{t('required')}</span> : undefined}
        />
        <Field
          label={t('prayerTime')}
          type="datetime-local"
          value={prayerTime}
          onChange={(e) => setPrayerTime(e.target.value)}
          className="col-span-2"
          hint={touched && !prayerTime ? <span className="text-red-500">{t('required')}</span> : undefined}
        />
        <Field
          label={t('burialLocation')}
          value={burialLocation}
          onChange={(e) => setBurialLocation(e.target.value)}
          className="col-span-2"
          hint={touched && !burialLocation.trim() ? <span className="text-red-500">{t('required')}</span> : undefined}
        />
        <Field label={t('verse')} value={verse} onChange={(e) => setVerse(e.target.value)} className="col-span-2" />
      </div>
    </FuneralModal>
  );
}

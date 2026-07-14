'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { Field } from './Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { mosqueApi } from '@/lib/mosqueApi';
import type { TransportPayload } from '@/lib/funeralApi';
import type { Transport } from './types';

// Rwandan phone: local 07XXXXXXXX; accepts +250/250 and normalizes to local.
const RW_PHONE = /^07\d{8}$/;
const normalizePhone = (v: string) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.startsWith('250') ? `0${d.slice(3)}` : d;
};

/** Create or edit a funeral transport means (registered under a mosque). */
export function TransportFormDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: Transport;
  onSave: (payload: TransportPayload) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.funeral.transports.form');

  const [name, setName] = useState(initial?.name ?? '');
  const [mosqueId, setMosqueId] = useState(initial?.mosqueId ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [mosques, setMosques] = useState<{ id: string; name: string }[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let active = true;
    mosqueApi.list()
      .then((rows) => { if (active) setMosques(rows.map((m) => ({ id: m.id, name: m.name }))); })
      .catch(() => { if (active) setMosques([]); });
    return () => { active = false; };
  }, []);

  const phoneValid = RW_PHONE.test(normalizePhone(phone));
  const valid = name.trim() && mosqueId && location.trim() && phoneValid;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSave({
      name: name.trim(),
      mosqueId,
      location: location.trim(),
      phone: normalizePhone(phone),
      isActive,
    });
  };

  const req = (v: string) => (touched && !v.trim() ? <span className="text-red-500">{t('required')}</span> : undefined);
  const phoneHint = touched
    ? (!phone.trim()
        ? <span className="text-red-500">{t('required')}</span>
        : (!phoneValid ? <span className="text-red-500">{t('phoneInvalid')}</span> : undefined))
    : undefined;

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
          placeholder={t('namePlaceholder')}
          className="col-span-2"
          hint={req(name) ?? t('nameHint')}
        />

        {/* Mosque select */}
        <label className="col-span-2">
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">{t('mosque')}</span>
          <SearchableSelect
            value={mosqueId}
            onChange={setMosqueId}
            options={mosques.map((m) => ({ value: m.id, label: m.name }))}
            placeholder={t('selectMosque')}
            searchPlaceholder={t('selectMosque')}
            size="md"
            triggerClassName="px-3"
          />
          {touched && !mosqueId
            ? <span className="mt-1 block text-[11px] text-red-500">{t('required')}</span>
            : <span className="mt-1 block text-[11px] text-gray-400">{t('mosqueHint')}</span>}
        </label>

        <Field
          label={t('location')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('locationPlaceholder')}
          className="col-span-2"
          hint={req(location) ?? t('locationHint')}
        />
        <Field
          label={t('phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX"
          hint={phoneHint ?? t('phoneHint')}
        />

        <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
          {t('active')}
        </label>
      </div>
    </FuneralModal>
  );
}

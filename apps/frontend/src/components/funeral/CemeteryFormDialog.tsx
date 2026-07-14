'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Check, LocateFixed, Loader2 } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { Field } from './Field';
import type { Cemetery } from './types';

// Leaflet touches window — load the picker only on the client.
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

/** Create or edit a cemetery record. */
export function CemeteryFormDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: Cemetery;
  onSave: (c: Cemetery) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.funeral.cemeteries.form');

  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '');
  const [used, setUsed] = useState(initial ? String(initial.used) : '');
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [lat, setLat] = useState(initial?.lat != null ? String(initial.lat) : '');
  const [lng, setLng] = useState(initial?.lng != null ? String(initial.lng) : '');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = name.trim() && address.trim() && Number(capacity) > 0;

  const latNum = lat.trim() && !Number.isNaN(Number(lat)) ? Number(lat) : null;
  const lngNum = lng.trim() && !Number.isNaN(Number(lng)) ? Number(lng) : null;

  const setCoords = (la: number, ln: number) => {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
    setGeoError('');
  };

  const findMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(t('geoUnsupported'));
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setGeoError(t('geoError'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const cap = Math.max(0, Number(capacity) || 0);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      address: address.trim(),
      capacity: cap,
      used: Math.min(cap, Math.max(0, Number(used) || 0)),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      lat: latNum ?? undefined,
      lng: lngNum ?? undefined,
    });
  };

  const req = (v: string) => (touched && !v.trim() ? <span className="text-red-500">{t('required')}</span> : undefined);

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
        <Field label={t('name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className="col-span-2" hint={req(name) ?? t('nameHint')} />
        <Field label={t('address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} className="col-span-2" hint={req(address) ?? t('addressHint')} />
        <Field
          label={t('capacity')}
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          hint={touched && !(Number(capacity) > 0) ? <span className="text-red-500">{t('required')}</span> : t('capacityHint')}
        />
        <Field label={t('used')} type="number" min={0} value={used} onChange={(e) => setUsed(e.target.value)} hint={t('usedHint')} />
        <Field label={t('contactPerson')} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} hint={t('contactPersonHint')} />
        <Field label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" hint={t('phoneHint')} />

        {/* Location: map picker + geolocation */}
        <div className="col-span-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-gray-600">{t('mapLabel')}</span>
            <button
              type="button"
              onClick={findMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-full border border-rmc-green/40 px-3 py-1 text-[12px] font-semibold text-rmc-green transition-colors hover:bg-rmc-green-light/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />}
              {locating ? t('locating') : t('findMyLocation')}
            </button>
          </div>
          <div className="h-64 overflow-hidden rounded-xl border border-gray-200">
            <LocationPicker lat={latNum} lng={lngNum} onChange={setCoords} />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{t('pickHint')}</p>
          {geoError && <p className="mt-1 text-[11px] text-red-500">{geoError}</p>}
        </div>

        <Field label={t('lat')} type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
        <Field label={t('lng')} type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
      </div>
    </FuneralModal>
  );
}

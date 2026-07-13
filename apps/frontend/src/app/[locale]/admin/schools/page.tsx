'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  GraduationCap, Plus, Pencil, Trash2, X, RefreshCw, Search, MapPin, LocateFixed,
} from 'lucide-react';

// Leaflet can't render on the server — load the map picker client-side only.
const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), { ssr: false });
import { PhoneInput, toE164, toLocalPhone } from '@/components/ui/PhoneInput';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { schoolsApi, type School, type SchoolPayload, type SchoolStatus } from '@/lib/schoolsApi';
import { SCHOOL_LEVELS, LEVEL_COLORS, type SchoolLevel } from '@/components/schools/data';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const PROVINCES = [
  { code: 'KIG', name: 'Kigali City' },
  { code: 'NOR', name: 'Northern Province' },
  { code: 'SOU', name: 'Southern Province' },
  { code: 'EAS', name: 'Eastern Province' },
  { code: 'WES', name: 'Western Province' },
];

export default function AdminSchoolsPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOOLS_VIEW]}>
      <SchoolsAdmin />
    </ProtectedRoute>
  );
}

function SchoolsAdmin() {
  const t = useTranslations('admin.schools');
  const tl = useTranslations('schools'); // shared level labels
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.SCHOOLS_MANAGE);

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<SchoolLevel | ''>('');
  const [modal, setModal] = useState<{ open: boolean; school: School | null }>({ open: false, school: null });
  const [deleting, setDeleting] = useState<School | null>(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      setSchools(await schoolsApi.admin.list());
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      schools.filter((s) => {
        if (levelFilter && s.level !== levelFilter) return false;
        if (q) return s.name.toLowerCase().includes(q) || (s.district ?? '').toLowerCase().includes(q);
        return true;
      }),
    [schools, q, levelFilter],
  );

  const levelLabel = (lvl: string) => tl(`level.${lvl}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10">
            <GraduationCap className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSchools}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className="h-4 w-4" /> {t('refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setModal({ open: true, school: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <Plus className="h-4 w-4" /> {t('new')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30"
          />
        </div>
        <SearchableSelect
          value={levelFilter}
          onChange={(v) => setLevelFilter(v as SchoolLevel | '')}
          options={[
            { value: '', label: t('allLevels') },
            ...SCHOOL_LEVELS.map((l) => ({ value: l, label: levelLabel(l) })),
          ]}
          className="w-full sm:w-52"
          triggerClassName="rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('noneTitle')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.name')}</th>
                <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.level')}</th>
                <th className="hidden px-4 py-3.5 font-medium text-gray-600 md:table-cell">{t('col.location')}</th>
                <th className="hidden px-4 py-3.5 font-medium text-gray-600 lg:table-cell">{t('col.contact')}</th>
                <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.status')}</th>
                {canManage && <th className="px-4 py-3.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((s) => (
                <tr key={s.id} className="align-top transition-colors hover:bg-rmc-green/[0.03]">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.principalName && <p className="text-xs text-gray-400">{s.principalName}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${LEVEL_COLORS[s.level] ?? '#0d3d24'}1a`,
                        color: LEVEL_COLORS[s.level] ?? '#0d3d24',
                      }}
                    >
                      {levelLabel(s.level)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3.5 text-gray-600 md:table-cell">
                    {s.district || '—'}
                    {s.gpsLat != null && s.gpsLng != null && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="h-2.5 w-2.5" /> {s.gpsLat.toFixed(3)}, {s.gpsLng.toFixed(3)}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3.5 text-gray-600 lg:table-cell">
                    {s.phone || '—'}
                    {s.email && <span className="block text-[11px] text-gray-400">{s.email}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {t(`status.${s.status}`)}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ open: true, school: s })}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                          aria-label={t('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(s)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <SchoolModal
          school={modal.school}
          onClose={() => setModal({ open: false, school: null })}
          onSaved={() => { setModal({ open: false, school: null }); fetchSchools(); }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          school={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); fetchSchools(); }}
        />
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-500';

function ModalShell({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">{children}</div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-6">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

function SchoolModal({ school, onClose, onSaved }: {
  school: School | null; onClose: () => void; onSaved: () => void;
}) {
  const t = useTranslations('admin.schools');
  const tl = useTranslations('schools');
  const isEdit = !!school;

  const [name, setName] = useState(school?.name ?? '');
  const [level, setLevel] = useState<SchoolLevel>(school?.level ?? 'primary');
  const [principalName, setPrincipalName] = useState(school?.principalName ?? '');
  const [phone, setPhone] = useState(toLocalPhone(school?.phone));
  const [email, setEmail] = useState(school?.email ?? '');
  const [district, setDistrict] = useState(school?.district ?? '');
  const [provinceCode, setProvinceCode] = useState(school?.provinceCode ?? 'KIG');
  const [gpsLat, setGpsLat] = useState(school?.gpsLat != null ? String(school.gpsLat) : '');
  const [gpsLng, setGpsLng] = useState(school?.gpsLng != null ? String(school.gpsLng) : '');
  const [status, setStatus] = useState<SchoolStatus>(school?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameErr, setNameErr] = useState('');

  // Map picker: bridge the string inputs to the numeric LocationPicker.
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');

  const latNum = gpsLat.trim() !== '' && Number.isFinite(Number(gpsLat)) ? Number(gpsLat) : null;
  const lngNum = gpsLng.trim() !== '' && Number.isFinite(Number(gpsLng)) ? Number(gpsLng) : null;

  const setCoords = (lat: number, lng: number) => {
    setGpsLat(lat.toFixed(6));
    setGpsLng(lng.toFixed(6));
  };

  const findMyLocation = () => {
    setGeoErr('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoErr('Location is not available in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords(latitude, longitude);
        setMapCenter([latitude, longitude]);
        setLocating(false);
      },
      () => {
        setGeoErr('Could not get your location. Allow location access or pick on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    if (!name.trim()) { setNameErr(t('required')); return; }
    setSaving(true);
    setError('');
    const payload: SchoolPayload = {
      name: name.trim(),
      level,
      principalName: principalName.trim() || undefined,
      phone: phone.trim() ? toE164(phone.trim()) : undefined,
      email: email.trim() || undefined,
      district: district.trim() || undefined,
      provinceCode,
      gpsLat: gpsLat.trim() ? Number(gpsLat) : undefined,
      gpsLng: gpsLng.trim() ? Number(gpsLng) : undefined,
      status,
    };
    try {
      if (isEdit && school) await schoolsApi.admin.update(school.id, payload);
      else await schoolsApi.admin.create(payload);
      onSaved();
    } catch {
      setError(t('saveError'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? t('editTitle') : t('newTitle')}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button onClick={save} disabled={saving} className="rounded-xl bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50">
            {saving ? t('saving') : isEdit ? t('save') : t('create')}
          </button>
        </>
      }
    >
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('field.name')} <span className="text-red-500">*</span></label>
          <input value={name} onChange={(e) => { setName(e.target.value); setNameErr(''); }} className={inputClass} />
          {nameErr && <p className="mt-1 text-[11px] text-red-600">{nameErr}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('field.level')}</label>
            <SearchableSelect
              value={level}
              onChange={(v) => setLevel(v as SchoolLevel)}
              options={SCHOOL_LEVELS.map((l) => ({ value: l, label: tl(`level.${l}`) }))}
              triggerClassName={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('field.status')}</label>
            <SearchableSelect
              value={status}
              onChange={(v) => setStatus(v as SchoolStatus)}
              options={[
                { value: 'active', label: t('status.active') },
                { value: 'inactive', label: t('status.inactive') },
              ]}
              triggerClassName={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>{t('field.principal')}</label>
          <input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('field.phone')}</label>
            <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('field.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('field.province')}</label>
            <SearchableSelect
              value={provinceCode}
              onChange={setProvinceCode}
              options={PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
              searchPlaceholder="Search provinces…"
              triggerClassName={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('field.district')}</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Nyarugenge, Kigali" className={inputClass} />
          </div>
        </div>
        {/* Location: pick on the map, use current location, or type coordinates */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className={labelClass + ' mb-0'}>{t('field.location')}</label>
            <button
              type="button"
              onClick={findMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-50"
            >
              <LocateFixed className={cn('h-3.5 w-3.5', locating && 'animate-spin')} />
              {locating ? t('locating') : t('findMyLocation')}
            </button>
          </div>
          <div className="h-64 w-full">
            <LocationPicker
              lat={latNum}
              lng={lngNum}
              onPick={(lat, lng) => setCoords(lat, lng)}
              flyToCenter={mapCenter}
            />
          </div>
          {geoErr && <p className="mt-1.5 text-[11px] text-red-600">{geoErr}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('field.lat')}</label>
            <input type="number" step="any" value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} placeholder="-1.9536" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('field.lng')}</label>
            <input type="number" step="any" value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} placeholder="30.0606" className={inputClass} />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">{t('gpsHint')}</p>
      </div>
    </ModalShell>
  );
}

function DeleteConfirm({ school, onClose, onDeleted }: {
  school: School; onClose: () => void; onDeleted: () => void;
}) {
  const t = useTranslations('admin.schools');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const del = async () => {
    setBusy(true);
    setError('');
    try {
      await schoolsApi.admin.remove(school.id);
      onDeleted();
    } catch {
      setError(t('deleteError'));
      setBusy(false);
    }
  };
  return (
    <ModalShell
      title={t('deleteTitle')}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button onClick={del} disabled={busy} className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? t('deleting') : t('confirmDelete')}
          </button>
        </>
      }
    >
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <p className="text-sm text-gray-600">{t('deletePrompt', { name: school.name })}</p>
    </ModalShell>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { publicApi } from '@/lib/public-api';
import { mosqueApi, type Mosque, type MosqueInput } from '@/lib/mosqueApi';
import { Avatar } from '@/components/ui/Avatar';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  Users,
  Phone,
  RotateCcw,
  LocateFixed,
} from 'lucide-react';
import { PhoneInput, toE164, toLocalPhone } from '@/components/ui/PhoneInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" />,
});

interface Province {
  id: string;
  name: string;
  code: string;
}
interface District {
  id: string;
  name: string;
  provinceId: string;
}
interface Sector {
  id: string;
  name: string;
  districtId: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const STEPS = [
  { title: 'Basics', subtitle: 'Name, address and parent mosque.' },
  { title: 'Location', subtitle: 'Administrative area and map coordinates.' },
  { title: 'Details', subtitle: 'Capacity, contact and prayer details.' },
];

const EMPTY: MosqueInput = {
  name: '',
  parentMosqueId: '',
  address: '',
  gpsLat: null,
  gpsLng: null,
  provinceId: '',
  districtId: '',
  sectorId: '',
  capacity: null,
  foundingYear: null,
  phone: '',
  email: '',
  fridayPrayerTime: '',
  imamName: '',
  imamPhone: '',
  imamPhoto: '',
};

export default function MosquesPage() {
  return (
    <ProtectedRoute permissions={[Permission.MOSQUES_VIEW]}>
      <ToastProvider>
        <MosquesManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function MosquesManager() {
  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(Permission.MOSQUES_CREATE);
  const canEdit = hasPermission(Permission.MOSQUES_EDIT);
  const canDelete = hasPermission(Permission.MOSQUES_DELETE);

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mosque | null>(null);
  const [form, setForm] = useState<MosqueInput>(EMPTY);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Mosque | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');

  const fetchMosques = useCallback(async () => {
    setLoading(true);
    try {
      setMosques(await mosqueApi.list());
    } catch {
      error('Failed to load mosques.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMosques();
  }, [fetchMosques]);

  // Location reference data for the dropdowns (public endpoints).
  useEffect(() => {
    Promise.all([publicApi.getProvinces(), publicApi.getDistricts()])
      .then(([p, d]) => {
        setProvinces(p as Province[]);
        setDistricts(d as District[]);
      })
      .catch(() => {
        /* dropdowns degrade to ids if reference data is unavailable */
      });
  }, []);

  // Load sectors whenever the district selection changes in the form.
  useEffect(() => {
    if (!form.districtId) {
      setSectors([]);
      return;
    }
    publicApi
      .getSectors(form.districtId)
      .then((s) => setSectors(s as Sector[]))
      .catch(() => setSectors([]));
  }, [form.districtId]);

  // Geocode the most-specific selected location and fly the map there.
  useEffect(() => {
    const districtLabel = districts.find((d) => d.id === form.districtId)?.name;
    const provinceLabel = provinces.find((p) => p.id === form.provinceId)?.name;
    const query = districtLabel
      ? `${districtLabel}, Rwanda`
      : provinceLabel
        ? `${provinceLabel}, Rwanda`
        : null;
    if (!query) return;
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data[0]) return;
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [form.districtId, form.provinceId, districts, provinces]);

  const provinceName = useCallback(
    (id: string | null) => provinces.find((p) => p.id === id)?.name ?? null,
    [provinces],
  );
  const districtName = useCallback(
    (id: string | null) => districts.find((d) => d.id === id)?.name ?? null,
    [districts],
  );

  // Districts available in the modal, scoped to the selected province.
  const formDistricts = useMemo(
    () => (form.provinceId ? districts.filter((d) => d.provinceId === form.provinceId) : districts),
    [districts, form.provinceId],
  );

  const set = <K extends keyof MosqueInput>(field: K, value: MosqueInput[K]) =>
    setForm((p) => ({ ...p, [field]: value }));

  // Fill coordinates from the browser's geolocation and recenter the map there.
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
        set('gpsLat', latitude);
        set('gpsLng', longitude);
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setStep(0);
    setIsModalOpen(true);
  };
  const openEdit = (m: Mosque) => {
    setEditing(m);
    setStep(0);
    setForm({
      name: m.name,
      parentMosqueId: m.parentMosqueId ?? '',
      address: m.address ?? '',
      gpsLat: m.gpsLat != null ? Number(m.gpsLat) : null,
      gpsLng: m.gpsLng != null ? Number(m.gpsLng) : null,
      provinceId: m.provinceId ?? '',
      districtId: m.districtId ?? '',
      sectorId: m.sectorId ?? '',
      capacity: m.capacity,
      foundingYear: m.foundingYear,
      phone: toLocalPhone(m.phone),
      email: m.email ?? '',
      fridayPrayerTime: m.fridayPrayerTime ?? '',
      imamName: m.imamName ?? '',
      imamPhone: toLocalPhone(m.imamPhone),
      imamPhoto: m.imamPhoto ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      error('Mosque name is required.');
      return;
    }
    setSaving(true);
    const normalized = {
      ...form,
      phone: form.phone ? toE164(form.phone) : form.phone,
      imamPhone: form.imamPhone ? toE164(form.imamPhone) : form.imamPhone,
    };
    try {
      if (editing) {
        await mosqueApi.update(editing.id, normalized);
        success('Mosque updated.');
      } else {
        await mosqueApi.create(normalized);
        success('Mosque added.');
      }
      setIsModalOpen(false);
      await fetchMosques();
    } catch {
      error('Could not save the mosque. Check the fields and try again.');
    } finally {
      setSaving(false);
    }
  }, [form, editing, success, error, fetchMosques]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await mosqueApi.remove(deleteTarget.id);
      success('Mosque deactivated.');
      setDeleteTarget(null);
      await fetchMosques();
    } catch {
      error('Could not deactivate the mosque.');
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, success, error, fetchMosques]);

  const handleReactivate = useCallback(
    async (m: Mosque) => {
      try {
        await mosqueApi.reactivate(m.id, { name: m.name });
        success('Mosque reactivated.');
        await fetchMosques();
      } catch {
        error('Could not reactivate the mosque.');
      }
    },
    [success, error, fetchMosques],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mosques.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (provinceFilter !== 'all' && m.provinceId !== provinceFilter) return false;
      if (q && !m.name.toLowerCase().includes(q) && !(m.address ?? '').toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [mosques, search, statusFilter, provinceFilter]);

  const activeCount = mosques.filter((m) => m.status === 'active').length;

  // Potential parent mosques: any active mosque other than the one being edited.
  const parentOptions = useMemo(
    () => mosques.filter((m) => m.status === 'active' && m.id !== editing?.id),
    [mosques, editing],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center">
            <Landmark className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mosques</h1>
            <p className="text-xs text-gray-400">
              {mosques.length} total · {activeCount} active
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl shadow-sm shadow-rmc-green/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Mosque
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or address…"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rmc-green/50 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="py-2.5 px-3 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rmc-green/50"
        >
          <option value="all">All provinces</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No mosques found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const inactive = m.status !== 'active';
            const loc = [districtName(m.districtId), provinceName(m.provinceId)]
              .filter(Boolean)
              .join(', ');
            return (
              <div
                key={m.id}
                className={`group flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${inactive ? 'bg-gray-50/60 border-gray-100 opacity-70' : 'bg-white border-gray-100 hover:border-rmc-green/20'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-rmc-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                    {inactive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-gray-200 text-gray-600">
                        Inactive
                      </span>
                    )}
                    {m.parentMosqueId && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-700">
                        Branch
                      </span>
                    )}
                  </div>
                  {m.address && <p className="text-xs text-gray-500 line-clamp-1">{m.address}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                    {loc && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {loc}
                      </span>
                    )}
                    {m.capacity != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {m.capacity}
                      </span>
                    )}
                    {m.imamName && (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={m.imamName} photo={m.imamPhoto} size={16} />
                        {m.imamName}
                      </span>
                    )}
                    {m.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => openEdit(m)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green-light transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete &&
                    (inactive ? (
                      <button
                        onClick={() => handleReactivate(m)}
                        title="Reactivate"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green-light transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(m)}
                        title="Deactivate"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal — multi-step wizard */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="3xl">
        <ModalHeader>
          <ModalTitle>{editing ? 'Edit Mosque' : 'New Mosque'}</ModalTitle>
          <ModalDescription>{STEPS[step].subtitle}</ModalDescription>
        </ModalHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 pb-1">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => {
                if (i < step || form.name.trim()) setStep(i);
              }}
              className="flex items-center gap-2 flex-1"
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                  i === step
                    ? 'bg-rmc-green text-white'
                    : i < step
                      ? 'bg-rmc-green-light text-rmc-green'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-[11px] font-semibold truncate ${i === step ? 'text-gray-900' : 'text-gray-400'}`}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`flex-1 h-px ${i < step ? 'bg-rmc-green/40' : 'bg-gray-200'}`} />
              )}
            </button>
          ))}
        </div>

        <ModalBody className="space-y-3 min-h-[50vh] max-h-[100vh] overflow-y-auto">
          {step === 0 && (
            <>
              <Field label="Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Nyamirambo Grand Mosque"
                  autoFocus
                />
              </Field>
              <Field label="Address">
                <textarea
                  rows={2}
                  value={form.address ?? ''}
                  onChange={(e) => set('address', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Street, area"
                />
              </Field>
              <Field label="Parent Mosque (for branches)">
                <SearchableSelect
                  value={form.parentMosqueId ?? ''}
                  onChange={(v) => set('parentMosqueId', v)}
                  options={parentOptions.map((p) => ({ value: p.id, label: p.name }))}
                  noneLabel="— None (standalone / root) —"
                  searchPlaceholder="Search mosques…"
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Province">
                <SearchableSelect
                  value={form.provinceId ?? ''}
                  onChange={(v) => {
                    set('provinceId', v);
                    set('districtId', '');
                    set('sectorId', '');
                  }}
                  options={provinces.map((p) => ({ value: p.id, label: p.name }))}
                  noneLabel="— Select province —"
                  searchPlaceholder="Search provinces…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="District">
                  <SearchableSelect
                    value={form.districtId ?? ''}
                    onChange={(v) => {
                      set('districtId', v);
                      set('sectorId', '');
                    }}
                    options={formDistricts.map((d) => ({ value: d.id, label: d.name }))}
                    noneLabel="— Select district —"
                    searchPlaceholder="Search districts…"
                  />
                </Field>
                <Field label="Sector">
                  <SearchableSelect
                    value={form.sectorId ?? ''}
                    onChange={(v) => set('sectorId', v)}
                    options={sectors.map((s) => ({ value: s.id, label: s.name }))}
                    noneLabel={form.districtId ? '— Select sector —' : '— Pick district first —'}
                    searchPlaceholder="Search sectors…"
                    disabled={!form.districtId}
                  />
                </Field>
              </div>
              {/* Map picker */}
              <Field label="GPS Coordinates">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={findMyLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-50"
                  >
                    <LocateFixed className={`h-3.5 w-3.5${locating ? ' animate-spin' : ''}`} />
                    {locating ? 'Locating…' : 'Find my location'}
                  </button>
                </div>
                <div className="h-64 w-full mb-2">
                  <LocationPicker
                    lat={form.gpsLat ?? null}
                    lng={form.gpsLng ?? null}
                    onPick={(lat, lng) => {
                      set('gpsLat', lat);
                      set('gpsLng', lng);
                    }}
                    flyToCenter={mapCenter}
                  />
                </div>
                {geoErr && <p className="mb-2 text-[11px] text-red-600">{geoErr}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.gpsLat ?? ''}
                      onChange={(e) =>
                        set('gpsLat', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className={inputCls}
                      placeholder="-1.9806"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.gpsLng ?? ''}
                      onChange={(e) =>
                        set('gpsLng', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className={inputCls}
                      placeholder="30.0469"
                    />
                  </div>
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity">
                  <input
                    type="number"
                    min={0}
                    value={form.capacity ?? ''}
                    onChange={(e) =>
                      set('capacity', e.target.value === '' ? null : Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Founding Year">
                  <input
                    type="number"
                    value={form.foundingYear ?? ''}
                    onChange={(e) =>
                      set('foundingYear', e.target.value === '' ? null : Number(e.target.value))
                    }
                    className={inputCls}
                    placeholder="1985"
                  />
                </Field>
              </div>
              <Field label="Friday Prayer Time">
                <input
                  type="time"
                  value={form.fridayPrayerTime ?? ''}
                  onChange={(e) => set('fridayPrayerTime', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Imam">
                <div className="flex items-center gap-3">
                  {form.imamName && (
                    <Avatar name={form.imamName} photo={form.imamPhoto} size={40} />
                  )}
                  <input
                    type="text"
                    value={form.imamName ?? ''}
                    onChange={(e) => set('imamName', e.target.value)}
                    className={inputCls}
                    placeholder="Sheikh…"
                  />
                </div>
              </Field>
              <Field label="Imam Phone">
                <PhoneInput
                  value={form.imamPhone ?? ''}
                  onChange={(e) => set('imamPhone', e.target.value)}
                />
              </Field>
              <Field label="Imam Photo">
                <div className="w-[130px]">
                  <ImageUploadField
                    value={form.imamPhoto ?? ''}
                    onChange={(url) => set('imamPhoto', url)}
                    heightClass="h-[130px]"
                    rounded="rounded-none"
                    compact
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <PhoneInput
                    value={form.phone ?? ''}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputCls}
                    placeholder="info@mosque.rw"
                  />
                </Field>
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={() => (step === 0 ? setIsModalOpen(false) : setStep((s) => s - 1))}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!form.name.trim()) {
                  error('Mosque name is required.');
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {editing ? 'Save Changes' : 'Add Mosque'}
            </button>
          )}
        </ModalFooter>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate mosque?"
        description={`"${deleteTarget?.name}" will be hidden from the public mosque finder. You can reactivate it later.`}
        confirmLabel="Deactivate"
        cancelLabel="Keep"
        variant="danger"
        isLoading={saving}
      />
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green/50 focus:border-transparent';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

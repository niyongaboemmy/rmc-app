'use client';

import { useEffect, useState } from 'react';
import { Building2, Navigation, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { publicApi } from '@/lib/public-api';
import { Select } from '@/components/ui/Select';

interface Mosque {
  id: string;
  name: string;
  address: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  districtId: string | null;
}

interface Province { id: string; name: string; code: string; }
interface District { id: string; name: string; code: string; provinceId: string; }

// Default map view centred on Rwanda when no mosque is selected.
const DEFAULT_MAP = 'https://maps.google.com/maps?q=Rwanda&z=8&output=embed';

function mapSrc(mosque: Mosque | null): string {
  if (mosque?.gpsLat != null && mosque?.gpsLng != null) {
    return `https://maps.google.com/maps?q=${mosque.gpsLat},${mosque.gpsLng}&z=15&output=embed`;
  }
  return DEFAULT_MAP;
}

export function MosqueFinder() {
  const t = useTranslations('contact');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selected, setSelected] = useState<Mosque | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    publicApi.getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (!selectedProvince) { setDistricts([]); setMosques([]); setSelected(null); return; }
    publicApi.getDistricts(selectedProvince).then(setDistricts);
    setSelectedDistrict('');
    setMosques([]);
    setSelected(null);
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedDistrict) { setMosques([]); setSelected(null); return; }
    setLoading(true);
    publicApi.getMosques(selectedDistrict)
      .then((list) => {
        setMosques(list);
        // Auto-focus the first mosque that has coordinates.
        setSelected(list.find((m: Mosque) => m.gpsLat != null && m.gpsLng != null) ?? null);
      })
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls + results list */}
      <div className="space-y-4">
        <Select
          label={t('province')}
          placeholder={t('selectProvince')}
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
        >
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        {districts.length > 0 && (
          <Select
            label={t('district')}
            placeholder={t('selectDistrict')}
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        )}

        {!loading && mosques.length > 0 && (
          <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
            {mosques.map((mosque) => {
              const isActive = selected?.id === mosque.id;
              const hasGps = mosque.gpsLat != null && mosque.gpsLng != null;
              return (
                <button
                  key={mosque.id}
                  type="button"
                  onClick={() => setSelected(mosque)}
                  aria-pressed={isActive}
                  className={`w-full text-left p-4 rounded-xl border bg-white transition-all ${
                    isActive
                      ? 'border-rmc-green ring-2 ring-rmc-green/15 shadow-sm'
                      : 'border-gray-100 hover:border-rmc-green/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-rmc-green" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{mosque.name}</h3>
                      {mosque.address && (
                        <p className="text-gray-500 text-sm mt-0.5">{mosque.address}</p>
                      )}
                      {hasGps && (
                        <a
                          href={`https://maps.google.com/?q=${mosque.gpsLat},${mosque.gpsLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-rmc-green text-xs font-medium mt-1.5 inline-flex items-center gap-1 hover:underline"
                        >
                          <Navigation className="w-3 h-3" /> {t('directions')}
                        </a>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && selectedDistrict && mosques.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">{t('noMosques')}</p>
        )}
      </div>

      {/* Live map */}
      <div className="lg:sticky lg:top-28 self-start">
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm aspect-[4/3] lg:aspect-auto lg:h-[28rem] bg-gray-100">
          <iframe
            key={mapSrc(selected)}
            title={t('findMosque')}
            src={mapSrc(selected)}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        {selected && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-4 h-4 text-rmc-green shrink-0" />
            <span className="font-medium text-gray-900">{selected.name}</span>
            {selected.address && <span className="text-gray-400">· {selected.address}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

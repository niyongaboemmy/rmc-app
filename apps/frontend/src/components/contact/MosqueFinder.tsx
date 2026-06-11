'use client';

import { useEffect, useState } from 'react';
import { Building2, Navigation } from 'lucide-react';
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

export function MosqueFinder() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    publicApi.getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (!selectedProvince) { setDistricts([]); setMosques([]); return; }
    publicApi.getDistricts(selectedProvince).then(setDistricts);
    setSelectedDistrict('');
    setMosques([]);
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedDistrict) { setMosques([]); return; }
    setLoading(true);
    publicApi.getMosques(selectedDistrict)
      .then(setMosques)
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  return (
    <div className="space-y-4">
      {/* Province */}
      <Select
        label="Province"
        placeholder="Select Province"
        value={selectedProvince}
        onChange={(e) => setSelectedProvince(e.target.value)}
      >
        {provinces.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      {/* District */}
      {districts.length > 0 && (
        <Select
          label="District"
          placeholder="Select District"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
        >
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && mosques.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {mosques.map((mosque) => (
            <div key={mosque.id} className="p-4 rounded-xl border border-gray-100 hover:border-rmc-green/30 bg-white hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-rmc-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{mosque.name}</h3>
                  {mosque.address && (
                    <p className="text-gray-500 text-sm mt-0.5">{mosque.address}</p>
                  )}
                  {mosque.gpsLat && mosque.gpsLng && (
                    <a
                      href={`https://maps.google.com/?q=${mosque.gpsLat},${mosque.gpsLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rmc-green text-xs font-medium mt-1 inline-flex items-center gap-1 hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Get Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedDistrict && mosques.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">No mosques found in this area.</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Islamic schools directory — curated static dataset.

   Each entry carries real Rwanda coordinates so the finder map works
   end-to-end without a backend. Names/principals here are sample data
   for the directory; edit this list to reflect the real institutions,
   or swap it for a backend API later (the components only depend on the
   `School` shape below).

   `provinceCode` matches the values used by the province GeoJSON /
   mosque finder: KIG, NOR, SOU, EAS, WES.
   ────────────────────────────────────────────────────────────── */

export type SchoolLevel = 'primary' | 'secondary' | 'madrassa' | 'tvet';

export interface School {
  id: string;
  name: string;
  /** Human-readable location, e.g. "Nyarugenge, Kigali". */
  district: string;
  provinceCode: string;
  level: SchoolLevel;
  principal: string | null;
  phone: string | null;
  email: string | null;
  gpsLat: number;
  gpsLng: number;
}

/** Levels in display order — labels are resolved via i18n (schools.level.*). */
export const SCHOOL_LEVELS: SchoolLevel[] = ['primary', 'secondary', 'madrassa', 'tvet'];

/** One map-pin / badge colour per level. Kept here (not in the Leaflet map
    module) so non-map code can read it without pulling Leaflet into SSR. */
export const LEVEL_COLORS: Record<string, string> = {
  primary: '#15803d', // green
  secondary: '#1d4ed8', // blue
  madrassa: '#7c3aed', // purple
  tvet: '#0891b2', // teal
};

export const SCHOOLS: School[] = [
  // ── Kigali ──────────────────────────────────────────────────────
  {
    id: 'sch-kig-1',
    name: 'Green Hills Islamic Academy',
    district: 'Nyarugenge, Kigali',
    provinceCode: 'KIG',
    level: 'secondary',
    principal: 'Sheikh Abdallah Ndayisaba',
    phone: '+250 788 100 201',
    email: 'info@greenhillsacademy.rw',
    gpsLat: -1.9536,
    gpsLng: 30.0606,
  },
  {
    id: 'sch-kig-2',
    name: 'Nyamirambo Islamic Primary School',
    district: 'Nyamirambo, Kigali',
    provinceCode: 'KIG',
    level: 'primary',
    principal: 'Madam Aisha Mukamana',
    phone: '+250 788 100 202',
    email: 'nyamirambo.primary@rmc.rw',
    gpsLat: -1.9842,
    gpsLng: 30.0445,
  },
  {
    id: 'sch-kig-3',
    name: 'Kigali Quran Memorisation Centre',
    district: 'Kicukiro, Kigali',
    provinceCode: 'KIG',
    level: 'madrassa',
    principal: 'Ustadh Bilal Hakizimana',
    phone: '+250 788 100 203',
    email: null,
    gpsLat: -1.9789,
    gpsLng: 30.1009,
  },
  // ── Northern Province ───────────────────────────────────────────
  {
    id: 'sch-nor-1',
    name: 'Musanze Islamic Secondary School',
    district: 'Musanze, Northern Province',
    provinceCode: 'NOR',
    level: 'secondary',
    principal: 'Sheikh Yusuf Niyonzima',
    phone: '+250 788 100 211',
    email: 'musanze.islamic@rmc.rw',
    gpsLat: -1.4985,
    gpsLng: 29.6357,
  },
  {
    id: 'sch-nor-2',
    name: 'Gicumbi Madrassa & Primary',
    district: 'Gicumbi, Northern Province',
    provinceCode: 'NOR',
    level: 'primary',
    principal: 'Madam Halima Uwase',
    phone: '+250 788 100 212',
    email: null,
    gpsLat: -1.5801,
    gpsLng: 30.0658,
  },
  // ── Southern Province ───────────────────────────────────────────
  {
    id: 'sch-sou-1',
    name: 'Huye Islamic Institute (TVET)',
    district: 'Huye, Southern Province',
    provinceCode: 'SOU',
    level: 'tvet',
    principal: 'Eng. Ramadhan Munyaneza',
    phone: '+250 788 100 221',
    email: 'huye.institute@rmc.rw',
    gpsLat: -2.5951,
    gpsLng: 29.7411,
  },
  {
    id: 'sch-sou-2',
    name: 'Muhanga Islamic Primary School',
    district: 'Muhanga, Southern Province',
    provinceCode: 'SOU',
    level: 'primary',
    principal: 'Madam Khadija Nyirahabimana',
    phone: '+250 788 100 222',
    email: null,
    gpsLat: -2.0795,
    gpsLng: 29.7548,
  },
  // ── Eastern Province ────────────────────────────────────────────
  {
    id: 'sch-eas-1',
    name: 'Rwamagana Islamic Secondary School',
    district: 'Rwamagana, Eastern Province',
    provinceCode: 'EAS',
    level: 'secondary',
    principal: 'Sheikh Hamza Nkurunziza',
    phone: '+250 788 100 231',
    email: 'rwamagana.islamic@rmc.rw',
    gpsLat: -1.9479,
    gpsLng: 30.4332,
  },
  {
    id: 'sch-eas-2',
    name: 'Nyagatare Quran Academy',
    district: 'Nyagatare, Eastern Province',
    provinceCode: 'EAS',
    level: 'madrassa',
    principal: 'Ustadh Omar Uwimana',
    phone: '+250 788 100 232',
    email: null,
    gpsLat: -1.2935,
    gpsLng: 30.3271,
  },
  // ── Western Province ────────────────────────────────────────────
  {
    id: 'sch-wes-1',
    name: 'Rubavu Islamic Primary & Secondary',
    district: 'Rubavu, Western Province',
    provinceCode: 'WES',
    level: 'secondary',
    principal: 'Sheikh Bilal Ntaganda',
    phone: '+250 788 100 241',
    email: 'rubavu.islamic@rmc.rw',
    gpsLat: -1.6789,
    gpsLng: 29.2601,
  },
  {
    id: 'sch-wes-2',
    name: 'Karongi Lakeside Madrassa',
    district: 'Karongi, Western Province',
    provinceCode: 'WES',
    level: 'madrassa',
    principal: 'Ustadh Ismail Hakizimana',
    phone: '+250 788 100 242',
    email: null,
    gpsLat: -2.0014,
    gpsLng: 29.3849,
  },
];

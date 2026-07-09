import { DataSource } from 'typeorm';

/**
 * Seed data for mosques across all five provinces of Rwanda.
 *
 * Location is given by `districtName` + `sectorName` (case-insensitive) and
 * resolved to ids at runtime — provinceId is taken from the matched district,
 * sectorId from the matched sector within that district (null if not found).
 * Coordinates are approximate. Idempotent on mosque name.
 */
interface MosqueSeed {
  name: string;
  districtName: string;
  sectorName: string;
  address: string;
  gpsLat: number;
  gpsLng: number;
  capacity: number;
  foundingYear: number;
  phone: string;
  email: string;
  fridayPrayerTime: string; // HH:MM
}

const MOSQUES: MosqueSeed[] = [
  // ── Kigali City ──
  {
    name: 'Masjid Al-Fatah (Nyamirambo Grand Mosque)',
    districtName: 'Nyarugenge',
    sectorName: 'Nyamirambo',
    address: 'Nyamirambo, Nyarugenge, Kigali',
    gpsLat: -1.98262,
    gpsLng: 30.03935,
    capacity: 3000,
    foundingYear: 1980,
    phone: '+250788300001',
    email: 'alfatah@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Kigali Islamic Cultural Centre',
    districtName: 'Nyarugenge',
    sectorName: 'Nyarugenge',
    address: 'Nyarugenge, Kigali',
    gpsLat: -1.94995,
    gpsLng: 30.05989,
    capacity: 1500,
    foundingYear: 1995,
    phone: '+250788300002',
    email: 'kicc@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Masjid Quba Remera',
    districtName: 'Gasabo',
    sectorName: 'Remera',
    address: 'Remera, Gasabo, Kigali',
    gpsLat: -1.9578,
    gpsLng: 30.1086,
    capacity: 1200,
    foundingYear: 2002,
    phone: '+250788300003',
    email: 'quba.remera@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Kimironko Friday Mosque',
    districtName: 'Gasabo',
    sectorName: 'Kimironko',
    address: 'Kimironko, Gasabo, Kigali',
    gpsLat: -1.9389,
    gpsLng: 30.125,
    capacity: 900,
    foundingYear: 2008,
    phone: '+250788300004',
    email: 'kimironko@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Kicukiro Central Mosque',
    districtName: 'Kicukiro',
    sectorName: 'Niboye',
    address: 'Niboye, Kicukiro, Kigali',
    gpsLat: -1.97,
    gpsLng: 30.1,
    capacity: 1000,
    foundingYear: 1999,
    phone: '+250788300005',
    email: 'kicukiro@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },

  // ── Southern Province ──
  {
    name: 'Huye Central Mosque',
    districtName: 'Huye',
    sectorName: 'Ngoma',
    address: 'Ngoma, Huye, Southern Province',
    gpsLat: -2.5967,
    gpsLng: 29.739,
    capacity: 800,
    foundingYear: 1955,
    phone: '+250788300006',
    email: 'huye@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },
  {
    name: 'Muhanga Central Mosque',
    districtName: 'Muhanga',
    sectorName: 'Nyamabuye',
    address: 'Nyamabuye, Muhanga, Southern Province',
    gpsLat: -2.078,
    gpsLng: 29.756,
    capacity: 600,
    foundingYear: 1978,
    phone: '+250788300007',
    email: 'muhanga@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },
  {
    name: 'Nyanza Town Mosque',
    districtName: 'Nyanza',
    sectorName: 'Busasamana',
    address: 'Busasamana, Nyanza, Southern Province',
    gpsLat: -2.3519,
    gpsLng: 29.7503,
    capacity: 500,
    foundingYear: 1985,
    phone: '+250788300008',
    email: 'nyanza@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },

  // ── Northern Province ──
  {
    name: 'Musanze Friday Mosque',
    districtName: 'Musanze',
    sectorName: 'Muhoza',
    address: 'Muhoza, Musanze, Northern Province',
    gpsLat: -1.4998,
    gpsLng: 29.634,
    capacity: 700,
    foundingYear: 1982,
    phone: '+250788300009',
    email: 'musanze@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },
  {
    name: 'Byumba Central Mosque',
    districtName: 'Gicumbi',
    sectorName: 'Byumba',
    address: 'Byumba, Gicumbi, Northern Province',
    gpsLat: -1.5763,
    gpsLng: 30.0675,
    capacity: 450,
    foundingYear: 1990,
    phone: '+250788300010',
    email: 'byumba@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },

  // ── Western Province ──
  {
    name: 'Rubavu (Gisenyi) Central Mosque',
    districtName: 'Rubavu',
    sectorName: 'Gisenyi',
    address: 'Gisenyi, Rubavu, Western Province',
    gpsLat: -1.6777,
    gpsLng: 29.258,
    capacity: 1100,
    foundingYear: 1970,
    phone: '+250788300011',
    email: 'rubavu@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },
  {
    name: 'Rusizi Grand Mosque',
    districtName: 'Rusizi',
    sectorName: 'Kamembe',
    address: 'Kamembe, Rusizi, Western Province',
    gpsLat: -2.4846,
    gpsLng: 28.9075,
    capacity: 900,
    foundingYear: 1968,
    phone: '+250788300012',
    email: 'rusizi@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },
  {
    name: 'Karongi Lakeside Mosque',
    districtName: 'Karongi',
    sectorName: 'Bwishyura',
    address: 'Bwishyura, Karongi, Western Province',
    gpsLat: -2.06,
    gpsLng: 29.35,
    capacity: 400,
    foundingYear: 1996,
    phone: '+250788300013',
    email: 'karongi@rmc.org.rw',
    fridayPrayerTime: '12:45',
  },

  // ── Eastern Province ──
  {
    name: 'Rwamagana Main Mosque',
    districtName: 'Rwamagana',
    sectorName: 'Kigabiro',
    address: 'Kigabiro, Rwamagana, Eastern Province',
    gpsLat: -1.9487,
    gpsLng: 30.4347,
    capacity: 750,
    foundingYear: 1988,
    phone: '+250788300014',
    email: 'rwamagana@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Nyagatare Friday Mosque',
    districtName: 'Nyagatare',
    sectorName: 'Nyagatare',
    address: 'Nyagatare, Eastern Province',
    gpsLat: -1.292,
    gpsLng: 30.3258,
    capacity: 850,
    foundingYear: 1992,
    phone: '+250788300015',
    email: 'nyagatare@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
  {
    name: 'Kayonza Central Mosque',
    districtName: 'Kayonza',
    sectorName: 'Mukarange',
    address: 'Mukarange, Kayonza, Eastern Province',
    gpsLat: -1.8806,
    gpsLng: 30.617,
    capacity: 500,
    foundingYear: 2001,
    phone: '+250788300016',
    email: 'kayonza@rmc.org.rw',
    fridayPrayerTime: '12:30',
  },
];

export async function seedMosques(dataSource: DataSource): Promise<void> {
  let inserted = 0;
  let skipped = 0;

  for (const m of MOSQUES) {
    const existing = await dataSource.query('SELECT id FROM mosques WHERE name = $1', [m.name]);
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const district = await dataSource.query(
      'SELECT id, province_id FROM districts WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [m.districtName],
    );
    if (!district.length) {
      // eslint-disable-next-line no-console
      console.log(`  [SEED] District "${m.districtName}" not found — skipped "${m.name}"`);
      continue;
    }
    const districtId = district[0].id;
    const provinceId = district[0].province_id;

    const sector = await dataSource.query(
      'SELECT id FROM sectors WHERE district_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
      [districtId, m.sectorName],
    );
    const sectorId = sector.length ? sector[0].id : null;

    await dataSource.query(
      `INSERT INTO mosques
        (name, address, gps_lat, gps_lng, province_id, district_id, sector_id,
         capacity, founding_year, phone, email, friday_prayer_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
      [
        m.name,
        m.address,
        m.gpsLat,
        m.gpsLng,
        provinceId,
        districtId,
        sectorId,
        m.capacity,
        m.foundingYear,
        m.phone,
        m.email,
        m.fridayPrayerTime,
      ],
    );
    inserted++;
  }

  // eslint-disable-next-line no-console
  console.log(
    `  [SEED] Mosques seeded (${inserted} inserted, ${skipped} already existed, ${MOSQUES.length} total)`,
  );
}

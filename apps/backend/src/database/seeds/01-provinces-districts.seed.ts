import { DataSource } from 'typeorm';

const PROVINCES = [
  { name: 'Kigali City', code: 'KIG' },
  { name: 'Northern Province', code: 'NOR' },
  { name: 'Southern Province', code: 'SOU' },
  { name: 'Eastern Province', code: 'EAS' },
  { name: 'Western Province', code: 'WES' },
];

const DISTRICTS: Record<string, { name: string; code: string }[]> = {
  KIG: [
    { name: 'Gasabo', code: 'KIG-GAS' },
    { name: 'Kicukiro', code: 'KIG-KIC' },
    { name: 'Nyarugenge', code: 'KIG-NYA' },
  ],
  NOR: [
    { name: 'Burera', code: 'NOR-BUR' },
    { name: 'Gakenke', code: 'NOR-GAK' },
    { name: 'Gicumbi', code: 'NOR-GIC' },
    { name: 'Musanze', code: 'NOR-MUS' },
    { name: 'Rulindo', code: 'NOR-RUL' },
  ],
  SOU: [
    { name: 'Gisagara', code: 'SOU-GIS' },
    { name: 'Huye', code: 'SOU-HUY' },
    { name: 'Kamonyi', code: 'SOU-KAM' },
    { name: 'Muhanga', code: 'SOU-MUH' },
    { name: 'Nyamagabe', code: 'SOU-MAG' },
    { name: 'Nyanza', code: 'SOU-NYA' },
    { name: 'Nyaruguru', code: 'SOU-RUG' },
    { name: 'Ruhango', code: 'SOU-RUH' },
  ],
  EAS: [
    { name: 'Bugesera', code: 'EAS-BUG' },
    { name: 'Gatsibo', code: 'EAS-GAT' },
    { name: 'Kayonza', code: 'EAS-KAY' },
    { name: 'Kirehe', code: 'EAS-KIR' },
    { name: 'Ngoma', code: 'EAS-NGO' },
    { name: 'Nyagatare', code: 'EAS-NYA' },
    { name: 'Rwamagana', code: 'EAS-RWA' },
  ],
  WES: [
    { name: 'Karongi', code: 'WES-KAR' },
    { name: 'Ngororero', code: 'WES-NGO' },
    { name: 'Nyabihu', code: 'WES-NYB' },
    { name: 'Nyamasheke', code: 'WES-NYM' },
    { name: 'Rubavu', code: 'WES-RUB' },
    { name: 'Rusizi', code: 'WES-RUS' },
    { name: 'Rutsiro', code: 'WES-RUT' },
  ],
};

export async function seedProvincesAndDistricts(dataSource: DataSource): Promise<void> {
  for (const province of PROVINCES) {
    const existing = await dataSource.query(`SELECT id FROM provinces WHERE code = $1`, [
      province.code,
    ]);

    let provinceId: string;
    if (existing.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO provinces (name, code) VALUES ($1, $2) RETURNING id`,
        [province.name, province.code],
      );
      provinceId = result[0].id;
    } else {
      provinceId = existing[0].id;
    }

    const districts = DISTRICTS[province.code] || [];
    for (const district of districts) {
      const existingDistrict = await dataSource.query(`SELECT id FROM districts WHERE code = $1`, [
        district.code,
      ]);
      if (existingDistrict.length === 0) {
        await dataSource.query(
          `INSERT INTO districts (name, code, province_id) VALUES ($1, $2, $3)`,
          [district.name, district.code, provinceId],
        );
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[Seed] Provinces and districts seeded successfully.`);
}

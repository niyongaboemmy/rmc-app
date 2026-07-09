import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `schools` table (from 001-initial-schema) with the fields the
 * public "Find Islamic Schools" map and its admin manager need: GPS
 * coordinates, level, a plain principal name, a human-readable district label
 * and a province code (KIG/NOR/SOU/EAS/WES) for map filtering.
 *
 * Also seeds the curated set of schools so the map works immediately and admins
 * start with manageable rows.
 */
export class SchoolsFinder1781957702483 implements MigrationInterface {
  name = 'SchoolsFinder1781957702483';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schools"
        ADD COLUMN IF NOT EXISTS "gps_lat" double precision,
        ADD COLUMN IF NOT EXISTS "gps_lng" double precision,
        ADD COLUMN IF NOT EXISTS "level" varchar(20) NOT NULL DEFAULT 'primary',
        ADD COLUMN IF NOT EXISTS "principal_name" varchar(150),
        ADD COLUMN IF NOT EXISTS "district" varchar(150),
        ADD COLUMN IF NOT EXISTS "province_code" varchar(8)
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schools_province_code" ON "schools" ("province_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schools_level" ON "schools" ("level")`,
    );

    // Seed the curated directory (idempotent: skip if a school of that name exists).
    const seed: Array<[string, string, string, string, string, string, string, number, number]> = [
      [
        'Green Hills Islamic Academy',
        'Nyarugenge, Kigali',
        'KIG',
        'secondary',
        'Sheikh Abdallah Ndayisaba',
        '+250 788 100 201',
        'info@greenhillsacademy.rw',
        -1.9536,
        30.0606,
      ],
      [
        'Nyamirambo Islamic Primary School',
        'Nyamirambo, Kigali',
        'KIG',
        'primary',
        'Madam Aisha Mukamana',
        '+250 788 100 202',
        'nyamirambo.primary@rmc.rw',
        -1.9842,
        30.0445,
      ],
      [
        'Kigali Quran Memorisation Centre',
        'Kicukiro, Kigali',
        'KIG',
        'madrassa',
        'Ustadh Bilal Hakizimana',
        '+250 788 100 203',
        '',
        -1.9789,
        30.1009,
      ],
      [
        'Musanze Islamic Secondary School',
        'Musanze, Northern Province',
        'NOR',
        'secondary',
        'Sheikh Yusuf Niyonzima',
        '+250 788 100 211',
        'musanze.islamic@rmc.rw',
        -1.4985,
        29.6357,
      ],
      [
        'Gicumbi Madrassa & Primary',
        'Gicumbi, Northern Province',
        'NOR',
        'primary',
        'Madam Halima Uwase',
        '+250 788 100 212',
        '',
        -1.5801,
        30.0658,
      ],
      [
        'Huye Islamic Institute (TVET)',
        'Huye, Southern Province',
        'SOU',
        'tvet',
        'Eng. Ramadhan Munyaneza',
        '+250 788 100 221',
        'huye.institute@rmc.rw',
        -2.5951,
        29.7411,
      ],
      [
        'Muhanga Islamic Primary School',
        'Muhanga, Southern Province',
        'SOU',
        'primary',
        'Madam Khadija Nyirahabimana',
        '+250 788 100 222',
        '',
        -2.0795,
        29.7548,
      ],
      [
        'Rwamagana Islamic Secondary School',
        'Rwamagana, Eastern Province',
        'EAS',
        'secondary',
        'Sheikh Hamza Nkurunziza',
        '+250 788 100 231',
        'rwamagana.islamic@rmc.rw',
        -1.9479,
        30.4332,
      ],
      [
        'Nyagatare Quran Academy',
        'Nyagatare, Eastern Province',
        'EAS',
        'madrassa',
        'Ustadh Omar Uwimana',
        '+250 788 100 232',
        '',
        -1.2935,
        30.3271,
      ],
      [
        'Rubavu Islamic Primary & Secondary',
        'Rubavu, Western Province',
        'WES',
        'secondary',
        'Sheikh Bilal Ntaganda',
        '+250 788 100 241',
        'rubavu.islamic@rmc.rw',
        -1.6789,
        29.2601,
      ],
      [
        'Karongi Lakeside Madrassa',
        'Karongi, Western Province',
        'WES',
        'madrassa',
        'Ustadh Ismail Hakizimana',
        '+250 788 100 242',
        '',
        -2.0014,
        29.3849,
      ],
    ];

    for (const [name, district, provinceCode, level, principal, phone, email, lat, lng] of seed) {
      await queryRunner.query(
        `INSERT INTO "schools" ("name", "district", "province_code", "level", "principal_name", "phone", "email", "gps_lat", "gps_lng", "status")
         SELECT $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::double precision, $9::double precision, 'active'
         WHERE NOT EXISTS (SELECT 1 FROM "schools" WHERE "name" = $1::varchar)`,
        [name, district, provinceCode, level, principal, phone, email || null, lat, lng],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded rows (those carrying a province_code), then the columns.
    await queryRunner.query(`DELETE FROM "schools" WHERE "province_code" IS NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schools_level"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schools_province_code"`);
    await queryRunner.query(`
      ALTER TABLE "schools"
        DROP COLUMN IF EXISTS "province_code",
        DROP COLUMN IF EXISTS "district",
        DROP COLUMN IF EXISTS "principal_name",
        DROP COLUMN IF EXISTS "level",
        DROP COLUMN IF EXISTS "gps_lng",
        DROP COLUMN IF EXISTS "gps_lat"
    `);
  }
}

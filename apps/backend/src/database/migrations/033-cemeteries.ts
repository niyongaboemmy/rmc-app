import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — cemeteries directory. Creates the cemeteries table and
 * seeds the initial set (previously frontend mock data).
 */
export class Cemeteries1786000000006 implements MigrationInterface {
  name = 'Cemeteries1786000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cemeteries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "address" varchar(300) NOT NULL,
        "capacity" int NOT NULL DEFAULT 0,
        "used" int NOT NULL DEFAULT 0,
        "contact_person" varchar(150),
        "phone" varchar(30),
        "gps_lat" decimal(10,7),
        "gps_lng" decimal(10,7),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_cemeteries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_cemetery_name" ON "cemeteries" ("name")`);

    await queryRunner.query(`
      INSERT INTO "cemeteries" ("name", "address", "capacity", "used", "contact_person", "phone", "gps_lat", "gps_lng") VALUES
        ('Nyamirambo Muslim Cemetery', 'Nyamirambo, Nyarugenge, Kigali', 4000, 3120, 'Sheikh Abdul Karim', '+250 788 300 100', -1.9806, 30.0469),
        ('Nyanza Muslim Cemetery', 'Nyanza, Southern Province', 2500, 980, 'Sheikh Musa Sindayigaya', '+250 788 300 110', -2.3517, 29.7407),
        ('Huye Muslim Cemetery', 'Huye, Southern Province', 1800, 1520, 'Sheikh Ramadhan Munyaneza', '+250 788 300 140', -2.5967, 29.7390),
        ('Musanze Muslim Cemetery', 'Musanze, Northern Province', 1500, 610, 'Sheikh Yusuf Niyonzima', '+250 788 300 120', -1.4998, 29.6340),
        ('Rubavu Muslim Cemetery', 'Rubavu, Western Province', 2000, 1740, 'Sheikh Bilal Ntaganda', '+250 788 300 180', -1.6777, 29.2580)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cemeteries"`);
  }
}

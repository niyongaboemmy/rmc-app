import { MigrationInterface, QueryRunner } from 'typeorm';

/** Transport means (hearse, minibus, …) offered for funerals, grouped by mosque. */
export class FuneralTransports1786000000016 implements MigrationInterface {
  name = 'FuneralTransports1786000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funeral_transports" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"            varchar(200) NOT NULL,
        "mosque_id"       uuid NOT NULL,
        "location"        varchar(200) NOT NULL,
        "contact_address" varchar(300),
        "phone"           varchar(30) NOT NULL,
        "is_active"       boolean NOT NULL DEFAULT true,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ,
        CONSTRAINT "PK_funeral_transports" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_funeral_transport_mosque" ON "funeral_transports" ("mosque_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_funeral_transport_mosque"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_transports"`);
  }
}

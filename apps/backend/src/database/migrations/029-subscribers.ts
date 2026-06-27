import { MigrationInterface, QueryRunner } from 'typeorm';

/** Newsletter subscribers (email-only, single opt-in) + one-click unsubscribe token. */
export class Subscribers1782900000000 implements MigrationInterface {
  name = 'Subscribers1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscribers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "locale" varchar(5) NOT NULL DEFAULT 'en',
        "source" varchar(40),
        "unsubscribe_token" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscribers_email" ON "subscribers" (LOWER("email"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscribers_unsub_token" ON "subscribers" ("unsubscribe_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscribers"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the single-row ai_settings table that holds the admin-managed
 * "Ask AI" assistant configuration (encrypted provider keys, default provider,
 * models, active flag) and seeds one inactive default row.
 */
export class AiSettings1786000000000 implements MigrationInterface {
  name = 'AiSettings1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_settings" (
        "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "default_provider" varchar(20)  NOT NULL DEFAULT 'gemini',
        "openai_key_enc"   text         NOT NULL DEFAULT '',
        "gemini_key_enc"   text         NOT NULL DEFAULT '',
        "openai_model"     varchar(80)  NOT NULL DEFAULT 'gpt-4o-mini',
        "gemini_model"     varchar(80)  NOT NULL DEFAULT 'gemini-2.5-flash',
        "is_active"        boolean      NOT NULL DEFAULT false,
        "updated_by"       uuid,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now()
      )
    `);

    // Seed exactly one row (disabled until the admin configures a provider key).
    await queryRunner.query(`
      INSERT INTO "ai_settings" ("default_provider")
      SELECT 'gemini'
      WHERE NOT EXISTS (SELECT 1 FROM "ai_settings")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_settings"`);
  }
}

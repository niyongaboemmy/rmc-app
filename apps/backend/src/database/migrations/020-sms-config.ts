import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the sms_config table used to store InTouch SMS gateway credentials
 * and operational settings. Credentials are managed by admin through the
 * system settings panel, not through environment variables.
 *
 * Seeds a default inactive row so the admin only needs to fill in credentials.
 */
export class SmsConfig1782000000000 implements MigrationInterface {
  name = 'SmsConfig1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_config" (
        "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "username"            varchar(100) NOT NULL DEFAULT '',
        "password_enc"        text         NOT NULL DEFAULT '',
        "sender_name"         varchar(11)  NOT NULL DEFAULT 'RMC',
        "dlr_url"             varchar(500),
        "is_active"           boolean      NOT NULL DEFAULT false,
        "balance_rwf"         decimal(12, 2),
        "balance_updated_at"  timestamptz,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz  NOT NULL DEFAULT now()
      )
    `);

    /* Seed one default row. Admin must set username + password to activate. */
    await queryRunner.query(`
      INSERT INTO "sms_config"
        ("username", "password_enc", "sender_name", "is_active")
      VALUES
        ('RMC', '', 'RMC', false)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_config"`);
  }
}

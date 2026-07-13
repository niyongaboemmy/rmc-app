import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hajj service — applications, status-history audit trail, the application-number
 * sequence, admin permissions, and the notification rows for the applicant
 * updates (SMS always; email when the applicant supplied an address).
 */
export class HajjTables1786000000018 implements MigrationInterface {
  name = 'HajjTables1786000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Application number sequence: RMC-HAJ-YYYYMM-NNNNN ────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "hajj_application_seq" START 1`);

    // ── Applications ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hajj_applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "application_number" varchar(30) NOT NULL,
        "full_name" varchar(150) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "email" varchar(150),
        "district" varchar(100) NOT NULL,
        "sector" varchar(100) NOT NULL,
        "passport_number" varchar(30) NOT NULL,
        "registration_fee_proof" varchar(500) NOT NULL,
        "advance_payment_proof" varchar(500) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'submitted',
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_hajj_applications_number" UNIQUE ("application_number")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hajj_applications_status" ON "hajj_applications" ("status")`,
    );

    // ── Status history (append-only audit trail) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hajj_status_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_hajj_status_history_application"
          FOREIGN KEY ("application_id") REFERENCES "hajj_applications" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hajj_status_history_application" ON "hajj_status_history" ("application_id")`,
    );

    // ── Permissions ─────────────────────────────────────────────────────────
    for (const perm of ['hajj:view', 'hajj:manage', 'hajj:approve']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(
            COALESCE(permissions, '[]'::jsonb) || $1::jsonb
          ) AS elem
        )
        WHERE name IN ('superadmin', 'admin')
      `,
        [JSON.stringify([perm])],
      );
    }

    // ── Notification settings — Hajj uses BOTH channels ──────────────────────
    // SMS reaches everyone (phone is required); email is applicable because the
    // applicant may supply an address, and carries the branded decision letter.
    await queryRunner.query(`
      INSERT INTO "notification_settings"
        ("event_key", "label", "description", "group_name", "email_applicable", "sms_applicable", "email_enabled", "sms_enabled")
      VALUES
        ('hajj.submission',
         'Hajj Application Submitted',
         'Confirms to the applicant that their Hajj application was received, with the application number.',
         'Hajj Service', true, true, true, true),

        ('hajj.status_change',
         'Hajj Application Status Change',
         'Notifies the applicant when their application moves to under review, or is approved or rejected.',
         'Hajj Service', true, true, true, true)
      ON CONFLICT ("event_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notification_settings" WHERE "event_key" IN ('hajj.submission', 'hajj.status_change')`,
    );

    for (const perm of ['hajj:view', 'hajj:manage', 'hajj:approve']) {
      await queryRunner.query(
        `
        UPDATE roles
        SET permissions = (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb)) AS elem
          WHERE elem::text != $1
        )
        WHERE name IN ('superadmin', 'admin')
      `,
        [JSON.stringify(perm)],
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "hajj_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hajj_applications"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "hajj_application_seq"`);
  }
}

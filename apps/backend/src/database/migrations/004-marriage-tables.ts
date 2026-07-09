import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarriageTables1700000000004 implements MigrationInterface {
  name = 'MarriageTables1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Marriage Applications ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS marriage_application_seq START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "marriage_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_number" varchar(30) NOT NULL,

        -- Applicant (must be RMC member)
        "applicant_id" uuid NOT NULL,

        -- Couple
        "groom_user_id" uuid,
        "groom_name" varchar(150) NOT NULL,
        "groom_nid" varchar(16) NOT NULL,
        "groom_phone" varchar(20),

        "bride_user_id" uuid,
        "bride_name" varchar(150) NOT NULL,
        "bride_nid" varchar(16) NOT NULL,
        "bride_phone" varchar(20),

        -- Islamic requirements
        "wali_name" varchar(150),
        "wali_nid" varchar(16),
        "wali_phone" varchar(20),
        "mahr_amount" decimal(14,2),
        "mahr_currency" varchar(10) DEFAULT 'RWF',
        "mahr_description" text,

        -- Witnesses
        "witness1_nid" varchar(16) NOT NULL,
        "witness1_name" varchar(150),
        "witness2_nid" varchar(16) NOT NULL,
        "witness2_name" varchar(150),

        -- Officiant
        "requested_officiant" varchar(150),
        "assigned_imam_id" uuid,

        -- Venue & Location
        "venue_type" varchar(20) NOT NULL CHECK (venue_type IN ('mosque', 'outside')),
        "province" varchar(50),
        "district" varchar(100),
        "mosque_id" uuid,
        "venue_address" text,

        -- Ceremony scheduling
        "preferred_date_from" date,
        "preferred_date_to" date,
        "ceremony_date" timestamptz,
        "ceremony_scheduled_by" uuid,
        "ceremony_scheduled_at" timestamptz,

        -- Status workflow
        "status" varchar(30) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','submitted','under_review','amendments_requested',
                            'approved','completed','rejected','cancelled','closed')),
        "payment_status" varchar(20) NOT NULL DEFAULT 'unpaid'
          CHECK (payment_status IN ('unpaid','pending_cash','processing','paid','refunded','failed')),
        "amount_due" decimal(12,2) NOT NULL DEFAULT 0,
        "amount_paid" decimal(12,2) NOT NULL DEFAULT 0,
        "payment_method" varchar(20) CHECK (payment_method IN ('momo','bank','cash')),

        -- Review
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,
        "amendments_requested_text" text,

        -- Certificate
        "certificate_url" varchar(500),
        "certificate_qr_code" varchar(200),
        "certificate_issued_at" timestamptz,
        "certificate_issued_by" uuid,

        -- Timestamps
        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_marriage_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_marriage_applications_number" UNIQUE ("application_number")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_status" ON "marriage_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_payment_status" ON "marriage_applications" ("payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_applicant" ON "marriage_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_groom_nid" ON "marriage_applications" ("groom_nid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_bride_nid" ON "marriage_applications" ("bride_nid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_ceremony_date" ON "marriage_applications" ("ceremony_date")`,
    );

    // ── Marriage Documents ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "marriage_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "document_type" varchar(50) NOT NULL
          CHECK (document_type IN ('groom_id','bride_id','wali_consent','mahr_agreement','portrait','additional')),
        "file_key" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "uploaded_by" uuid,
        "verified" boolean DEFAULT false,
        "verified_by" uuid,
        "verified_at" timestamptz,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_marriage_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_marriage_documents_application"
          FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE
      )
    `);

    // ── Marriage Status History ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "marriage_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_marriage_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_marriage_status_history_application"
          FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE
      )
    `);

    // ── Marriage Transactions ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "marriage_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "method" varchar(20) NOT NULL CHECK (method IN ('momo','bank','cash')),
        "provider_ref" varchar(200),
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'RWF',
        "status" varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','completed','failed','refunded')),
        "initiated_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "confirmed_by" uuid,
        "metadata" jsonb,

        CONSTRAINT "PK_marriage_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_marriage_transactions_application"
          FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marriage_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marriage_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marriage_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marriage_applications"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS marriage_application_seq`);
  }
}

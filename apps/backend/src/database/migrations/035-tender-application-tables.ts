import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tender bid submissions.
 *
 * Tenders themselves are NOT their own table — they are rows in `announcements`
 * with type = 'tender' (see migration 013). So `tender_id` is an FK into
 * `announcements`, and the service layer is what enforces that the referenced
 * announcement is actually a tender. There is no DB-level way to express
 * "FK to a subset of rows".
 */
export class TenderApplicationTables1786100000035 implements MigrationInterface {
  name = 'TenderApplicationTables1786100000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS tender_application_seq START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "tender_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_number" varchar(40) NOT NULL,

        "tender_id" uuid NOT NULL,
        "applicant_id" uuid NOT NULL,

        -- Bidding company
        "company_name" varchar(200) NOT NULL,
        "company_tin" varchar(20) NOT NULL,
        "contact_name" varchar(150) NOT NULL,

        -- Contact
        "email" varchar(255),
        "phone" varchar(20) NOT NULL,

        -- Address (Cell/Village have no master-data entities — free text, as in good_conduct_requests)
        "district_id" uuid,
        "sector_id" uuid,
        "cell" varchar(100),
        "village" varchar(100),

        -- Bid detail
        "bid_amount" decimal(14,2),
        "cover_note" text,

        -- Status workflow. No 'draft': bids carry no fee, so a submission is
        -- immediately real (contrast good_conduct_requests, which sits in draft
        -- until payment clears).
        "status" varchar(30) NOT NULL DEFAULT 'submitted'
          CHECK (status IN ('submitted','under_review','more_info_requested',
                            'shortlisted','awarded','rejected','withdrawn')),

        -- Review
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,
        "more_info_requested" text,

        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_tender_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tender_applications_application_number" UNIQUE ("application_number"),
        CONSTRAINT "FK_tender_applications_tender"
          FOREIGN KEY ("tender_id") REFERENCES "announcements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tender_applications_applicant"
          FOREIGN KEY ("applicant_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_tender_applications_district"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id"),
        CONSTRAINT "FK_tender_applications_sector"
          FOREIGN KEY ("sector_id") REFERENCES "sectors"("id"),
        CONSTRAINT "FK_tender_applications_reviewed_by"
          FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      )
    `);

    // One live bid per company per tender. Withdrawn/rejected bids are excluded
    // so an applicant who withdraws can re-bid before the deadline. Partial
    // unique index rather than a plain UNIQUE, which would block that re-bid.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tender_app_one_active_per_applicant"
        ON "tender_applications" ("tender_id", "applicant_id")
        WHERE "status" NOT IN ('withdrawn', 'rejected') AND "deleted_at" IS NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tender_app_tender" ON "tender_applications" ("tender_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tender_app_applicant" ON "tender_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tender_app_status" ON "tender_applications" ("status")`,
    );

    // ── Documents ──────────────────────────────────────────────────────────────
    // Files live on the file-server; only the key + metadata are stored here.
    await queryRunner.query(`
      CREATE TABLE "tender_application_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "doc_type" varchar(30) NOT NULL
          CHECK (doc_type IN ('rdb_certificate','tax_clearance','proposal')),
        "file_key" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "verified" boolean NOT NULL DEFAULT false,
        "verified_by" uuid,
        "verified_at" timestamptz,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_tender_application_documents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tender_app_doc_type" UNIQUE ("application_id", "doc_type"),
        CONSTRAINT "FK_tender_app_doc_application"
          FOREIGN KEY ("application_id") REFERENCES "tender_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tender_app_doc_verified_by"
          FOREIGN KEY ("verified_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tender_app_doc_application" ON "tender_application_documents" ("application_id")`,
    );

    // ── Status history ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tender_application_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_tender_application_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tender_app_history_application"
          FOREIGN KEY ("application_id") REFERENCES "tender_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tender_app_history_changed_by"
          FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tender_app_history_application" ON "tender_application_status_history" ("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tender_application_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tender_application_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tender_applications"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS tender_application_seq`);
  }
}

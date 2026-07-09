import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoodConductTables1700000000031 implements MigrationInterface {
  name = 'GoodConductTables1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS good_conduct_request_seq START 1
    `);

    await queryRunner.query(`
      CREATE TABLE "good_conduct_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "certificate_number" varchar(40),

        "applicant_id" uuid NOT NULL,

        -- Identity
        "full_names" varchar(150) NOT NULL,
        "father_name" varchar(150),
        "mother_name" varchar(150),

        -- Residence (Cell/Village have no master-data entities yet — free text)
        "district_id" uuid,
        "sector_id" uuid,
        "cell" varchar(100),
        "village" varchar(100),

        -- Contact
        "email" varchar(255),
        "phone" varchar(20) NOT NULL,

        -- Masjid / Imam
        "mosque_id" uuid,
        "requested_imam_name" varchar(150),
        "assigned_imam_id" uuid,

        -- Request detail
        "motif" varchar(50) NOT NULL,
        "motif_detail" text,

        -- Status workflow
        "status" varchar(30) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','submitted','under_review','more_info_requested',
                            'approved','rejected','cancelled','closed')),
        "payment_status" varchar(20) NOT NULL DEFAULT 'unpaid'
          CHECK (payment_status IN ('unpaid','pending_cash','processing','paid','refunded','failed')),
        "amount_due" decimal(12,2) NOT NULL,
        "amount_paid" decimal(12,2) NOT NULL DEFAULT 0,

        -- Review
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "rejection_reason" text,
        "more_info_requested" text,

        -- Certificate
        "certificate_url" varchar(500),
        "certificate_qr_payload" varchar(300),
        "certificate_issued_at" timestamptz,
        "certificate_issued_by" uuid,

        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,

        CONSTRAINT "PK_good_conduct_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_good_conduct_requests_certificate_number" UNIQUE ("certificate_number"),
        CONSTRAINT "FK_good_conduct_requests_applicant"
          FOREIGN KEY ("applicant_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_good_conduct_requests_district"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id"),
        CONSTRAINT "FK_good_conduct_requests_sector"
          FOREIGN KEY ("sector_id") REFERENCES "sectors"("id"),
        CONSTRAINT "FK_good_conduct_requests_mosque"
          FOREIGN KEY ("mosque_id") REFERENCES "mosques"("id"),
        CONSTRAINT "FK_good_conduct_requests_assigned_imam"
          FOREIGN KEY ("assigned_imam_id") REFERENCES "mosque_imams"("id"),
        CONSTRAINT "FK_good_conduct_requests_reviewed_by"
          FOREIGN KEY ("reviewed_by") REFERENCES "users"("id"),
        CONSTRAINT "FK_good_conduct_requests_certificate_issued_by"
          FOREIGN KEY ("certificate_issued_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_good_conduct_req_status" ON "good_conduct_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_good_conduct_req_payment_status" ON "good_conduct_requests" ("payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_good_conduct_req_applicant" ON "good_conduct_requests" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_good_conduct_req_mosque" ON "good_conduct_requests" ("mosque_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_good_conduct_req_certificate_number" ON "good_conduct_requests" ("certificate_number")`,
    );

    await queryRunner.query(`
      CREATE TABLE "good_conduct_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by" uuid,
        "notes" text,
        "changed_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_good_conduct_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_good_conduct_status_history_request"
          FOREIGN KEY ("request_id") REFERENCES "good_conduct_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_good_conduct_status_history_changed_by"
          FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "good_conduct_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL,
        "method" varchar(20) NOT NULL CHECK (method IN ('momo', 'bank', 'cash')),
        "provider_ref" varchar(200),
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'RWF',
        "status" varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','completed','failed','refunded')),
        "initiated_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "confirmed_by" uuid,
        "metadata" jsonb,

        CONSTRAINT "PK_good_conduct_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_good_conduct_transactions_request"
          FOREIGN KEY ("request_id") REFERENCES "good_conduct_requests"("id"),
        CONSTRAINT "FK_good_conduct_transactions_confirmed_by"
          FOREIGN KEY ("confirmed_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "good_conduct_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "good_conduct_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "good_conduct_requests"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS good_conduct_request_seq`);
  }
}

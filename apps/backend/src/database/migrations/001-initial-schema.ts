import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    // pgvector for Phase 6 AI embeddings — added in Phase 6 migration
    // await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // ── Locations ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "provinces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "code" varchar(10) NOT NULL,
        CONSTRAINT "PK_provinces" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provinces_name" UNIQUE ("name"),
        CONSTRAINT "UQ_provinces_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "districts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "code" varchar(10) NOT NULL,
        "province_id" uuid NOT NULL,
        CONSTRAINT "PK_districts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_districts_code" UNIQUE ("code"),
        CONSTRAINT "FK_districts_province_id" FOREIGN KEY ("province_id")
          REFERENCES "provinces"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sectors" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "district_id" uuid NOT NULL,
        CONSTRAINT "PK_sectors" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sectors_district_id" FOREIGN KEY ("district_id")
          REFERENCES "districts"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "areas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "sector_id" uuid,
        "district_id" uuid,
        CONSTRAINT "PK_areas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_areas_sector_id" FOREIGN KEY ("sector_id")
          REFERENCES "sectors"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_areas_district_id" FOREIGN KEY ("district_id")
          REFERENCES "districts"("id") ON DELETE SET NULL
      )
    `);

    // ── Mosques ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mosques" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "parent_mosque_id" uuid,
        "address" text,
        "gps_lat" decimal(10,8),
        "gps_lng" decimal(11,8),
        "province_id" uuid,
        "district_id" uuid,
        "sector_id" uuid,
        "capacity" integer,
        "founding_year" integer,
        "phone" varchar(20),
        "email" varchar(255),
        "friday_prayer_time" time,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mosques" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mosques_parent_mosque_id" FOREIGN KEY ("parent_mosque_id")
          REFERENCES "mosques"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_mosques_province_id" FOREIGN KEY ("province_id")
          REFERENCES "provinces"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_mosques_district_id" FOREIGN KEY ("district_id")
          REFERENCES "districts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_mosques_sector_id" FOREIGN KEY ("sector_id")
          REFERENCES "sectors"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mosques_parent_mosque_id" ON "mosques" ("parent_mosque_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_mosques_district_id" ON "mosques" ("district_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_mosques_status" ON "mosques" ("status")`);

    // ── Users ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "national_id" varchar(16),
        "email" varchar(255) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "date_of_birth" date,
        "gender" varchar(10),
        "profile_photo_url" varchar(500),
        "role" varchar(20) NOT NULL DEFAULT 'user',
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "member_category" varchar(20) NOT NULL DEFAULT 'standard',
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "is_phone_verified" boolean NOT NULL DEFAULT false,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" varchar(500),
        "last_login_at" timestamptz,
        "mosque_id" uuid,
        "area_id" uuid,
        "digital_id_number" varchar(20),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "UQ_users_national_id" UNIQUE ("national_id"),
        CONSTRAINT "UQ_users_digital_id_number" UNIQUE ("digital_id_number"),
        CONSTRAINT "FK_users_mosque_id" FOREIGN KEY ("mosque_id")
          REFERENCES "mosques"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_users_area_id" FOREIGN KEY ("area_id")
          REFERENCES "areas"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_phone" ON "users" ("phone")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_national_id" ON "users" ("national_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_mosque_id" ON "users" ("mosque_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_area_id" ON "users" ("area_id")`);

    // ── Mosque Imams ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mosque_imams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "mosque_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "start_date" date NOT NULL,
        "end_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mosque_imams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mosque_imams_mosque_id" FOREIGN KEY ("mosque_id")
          REFERENCES "mosques"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mosque_imams_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mosque_imams_mosque_id" ON "mosque_imams" ("mosque_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mosque_imams_user_id" ON "mosque_imams" ("user_id")`,
    );

    // ── Auth tokens ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash")`,
    );

    await queryRunner.query(`
      CREATE TABLE "phone_otp_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "phone" varchar(20) NOT NULL,
        "otp_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "verified_at" timestamptz,
        "attempts" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_phone_otp_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_phone_otp_verifications_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_phone_otp_verifications_user_id" ON "phone_otp_verifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_phone_otp_verifications_phone" ON "phone_otp_verifications" ("phone")`,
    );

    // ── Member Profiles ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "member_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "membership_number" varchar(20) NOT NULL,
        "joined_date" date NOT NULL,
        "occupation" varchar(100),
        "education_level" varchar(50),
        "emergency_contact_name" varchar(100),
        "emergency_contact_phone" varchar(20),
        "consent_given" boolean NOT NULL DEFAULT false,
        "consent_date" timestamptz,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_member_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_member_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_member_profiles_membership_number" UNIQUE ("membership_number"),
        CONSTRAINT "FK_member_profiles_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── Service Applications ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "service_applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_number" varchar(30) NOT NULL,
        "service_type" varchar(30) NOT NULL,
        "applicant_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "payment_status" varchar(20) NOT NULL DEFAULT 'unpaid',
        "amount_due" decimal(12,2),
        "amount_paid" decimal(12,2),
        "submitted_at" timestamptz NOT NULL,
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "review_notes" text,
        "certificate_url" varchar(500),
        "certificate_qr_code" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_service_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_applications_application_number" UNIQUE ("application_number"),
        CONSTRAINT "FK_service_applications_applicant_id" FOREIGN KEY ("applicant_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_service_applications_reviewed_by" FOREIGN KEY ("reviewed_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_applications_service_type" ON "service_applications" ("service_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_applications_applicant_id" ON "service_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_applications_status" ON "service_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_applications_payment_status" ON "service_applications" ("payment_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_applications_certificate_qr_code" ON "service_applications" ("certificate_qr_code")`,
    );

    await queryRunner.query(`
      CREATE TABLE "service_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "document_type" varchar(50) NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "uploaded_at" timestamptz NOT NULL,
        CONSTRAINT "PK_service_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_documents_application_id" FOREIGN KEY ("application_id")
          REFERENCES "service_applications"("id") ON DELETE CASCADE
      )
    `);

    // ── Donations ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "donation_campaigns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "slug" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "target_amount" decimal(14,2) NOT NULL,
        "raised_amount" decimal(14,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "fund_type" varchar(20) NOT NULL DEFAULT 'general',
        "start_date" date NOT NULL,
        "end_date" date,
        "hero_image_url" varchar(500),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_donation_campaigns" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_donation_campaigns_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_donation_campaigns_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_campaigns_slug" ON "donation_campaigns" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_campaigns_status" ON "donation_campaigns" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_donation_campaigns_fund_type" ON "donation_campaigns" ("fund_type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "donations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid,
        "donor_id" uuid,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "frequency" varchar(20) NOT NULL DEFAULT 'once',
        "next_charge_date" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "message" text,
        "donated_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_donations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_donations_campaign_id" FOREIGN KEY ("campaign_id")
          REFERENCES "donation_campaigns"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_donations_donor_id" FOREIGN KEY ("donor_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_donations_campaign_id" ON "donations" ("campaign_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_donations_donor_id" ON "donations" ("donor_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_donations_frequency" ON "donations" ("frequency")`);
    await queryRunner.query(`CREATE INDEX "IDX_donations_is_active" ON "donations" ("is_active")`);

    await queryRunner.query(`
      CREATE TABLE "orphan_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "photo_url" varchar(500),
        "date_of_birth" date NOT NULL,
        "background_story" text,
        "monthly_sponsorship_cost" decimal(10,2) NOT NULL,
        "sponsor_id" uuid,
        "sponsored_since" date,
        "status" varchar(20) NOT NULL DEFAULT 'available',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orphan_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orphan_profiles_sponsor_id" FOREIGN KEY ("sponsor_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ── Transactions ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reference" varchar(50) NOT NULL,
        "external_reference" varchar(100),
        "application_id" uuid,
        "donation_id" uuid,
        "user_id" uuid NOT NULL,
        "provider" varchar(20) NOT NULL,
        "type" varchar(20) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "initiated_at" timestamptz NOT NULL,
        "completed_at" timestamptz,
        "webhook_received_at" timestamptz,
        "idempotency_key" varchar(100) NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference"),
        CONSTRAINT "UQ_transactions_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_transactions_application_id" FOREIGN KEY ("application_id")
          REFERENCES "service_applications"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_transactions_donation_id" FOREIGN KEY ("donation_id")
          REFERENCES "donations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_reference" ON "transactions" ("reference")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_id" ON "transactions" ("user_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_provider" ON "transactions" ("provider")`,
    );

    // ── Events ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "description" text,
        "event_type" varchar(50) NOT NULL,
        "start_datetime" timestamptz NOT NULL,
        "end_datetime" timestamptz,
        "location_name" varchar(200),
        "location_address" text,
        "mosque_id" uuid,
        "capacity" integer,
        "registration_deadline" timestamptz,
        "image_url" varchar(500),
        "status" varchar(20) NOT NULL DEFAULT 'upcoming',
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_mosque_id" FOREIGN KEY ("mosque_id")
          REFERENCES "mosques"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_events_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_events_start_datetime" ON "events" ("start_datetime")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_events_status" ON "events" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_events_mosque_id" ON "events" ("mosque_id")`);

    await queryRunner.query(`
      CREATE TABLE "event_registrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "qr_code" varchar(100) NOT NULL,
        "attended" boolean NOT NULL DEFAULT false,
        "attended_at" timestamptz,
        "registered_at" timestamptz NOT NULL,
        CONSTRAINT "PK_event_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_registrations_qr_code" UNIQUE ("qr_code"),
        CONSTRAINT "UQ_event_registrations_event_user" UNIQUE ("event_id", "user_id"),
        CONSTRAINT "FK_event_registrations_event_id" FOREIGN KEY ("event_id")
          REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_registrations_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── Communications ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "content" text NOT NULL,
        "priority" varchar(10) NOT NULL DEFAULT 'normal',
        "target_audience" varchar(20) NOT NULL DEFAULT 'all',
        "target_id" uuid,
        "publish_at" timestamptz NOT NULL,
        "expires_at" timestamptz,
        "is_published" boolean NOT NULL DEFAULT false,
        "broadcast_sent" boolean NOT NULL DEFAULT false,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_announcements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcements_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "channel" varchar(10) NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz,
        "metadata" jsonb,
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);

    // ── Finance ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "income_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "source" varchar(50) NOT NULL,
        "reference_id" uuid,
        "fund_type" varchar(20) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "recorded_at" timestamptz NOT NULL,
        "recorded_by" uuid NOT NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_income_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_income_records_recorded_by" FOREIGN KEY ("recorded_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category" varchar(50) NOT NULL,
        "fund_type" varchar(20) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'RWF',
        "vendor" varchar(100),
        "description" text NOT NULL,
        "receipt_url" varchar(500),
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "approved_by" uuid,
        "approved_at" timestamptz,
        "second_approver_id" uuid,
        "second_approved_at" timestamptz,
        "recorded_at" timestamptz NOT NULL,
        "recorded_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expense_records_recorded_by" FOREIGN KEY ("recorded_by")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_expense_records_approved_by" FOREIGN KEY ("approved_by")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_expense_records_second_approver_id" FOREIGN KEY ("second_approver_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(20) NOT NULL,
        "actor_id" uuid NOT NULL,
        "actor_role" varchar(20) NOT NULL,
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "performed_at" timestamptz NOT NULL,
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_log_actor_id" FOREIGN KEY ("actor_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_entity_type" ON "audit_log" ("entity_type")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_entity_id" ON "audit_log" ("entity_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_actor_id" ON "audit_log" ("actor_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_performed_at" ON "audit_log" ("performed_at")`,
    );

    // ── Schools ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "schools" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "mosque_id" uuid,
        "district_id" uuid,
        "principal_id" uuid,
        "phone" varchar(20),
        "email" varchar(255),
        "founding_year" integer,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schools" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schools_mosque_id" FOREIGN KEY ("mosque_id")
          REFERENCES "mosques"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_schools_district_id" FOREIGN KEY ("district_id")
          REFERENCES "districts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_schools_principal_id" FOREIGN KEY ("principal_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "school_classes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "school_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "level" varchar(50) NOT NULL,
        "academic_year" varchar(10) NOT NULL,
        "teacher_id" uuid,
        "schedule" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_school_classes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_school_classes_school_id" FOREIGN KEY ("school_id")
          REFERENCES "schools"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_school_classes_teacher_id" FOREIGN KEY ("teacher_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "student_enrollments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "school_id" uuid NOT NULL,
        "class_id" uuid NOT NULL,
        "enrollment_date" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "academic_year" varchar(10) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_enrollments_user_class_year" UNIQUE ("user_id", "class_id", "academic_year"),
        CONSTRAINT "FK_student_enrollments_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_student_enrollments_school_id" FOREIGN KEY ("school_id")
          REFERENCES "schools"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_student_enrollments_class_id" FOREIGN KEY ("class_id")
          REFERENCES "school_classes"("id") ON DELETE CASCADE
      )
    `);

    // ── AI / Knowledge Base ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "knowledge_base_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(300) NOT NULL,
        "content" text NOT NULL,
        "category" varchar(50) NOT NULL,
        "language" varchar(5) NOT NULL DEFAULT 'en',
        "tags" varchar[],
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_knowledge_base_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_base_entries_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_base_entries_category" ON "knowledge_base_entries" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_base_entries_language" ON "knowledge_base_entries" ("language")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_base_entries_is_active" ON "knowledge_base_entries" ("is_active")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ai_chat_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "session_token" varchar(100) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "message_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_chat_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_chat_sessions_session_token" UNIQUE ("session_token"),
        CONSTRAINT "FK_ai_chat_sessions_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_chat_sessions_session_token" ON "ai_chat_sessions" ("session_token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_chat_sessions_user_id" ON "ai_chat_sessions" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ai_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL,
        "role" varchar(10) NOT NULL,
        "content" text NOT NULL,
        "language" varchar(5),
        "feedback" varchar(10),
        "created_at" timestamptz NOT NULL,
        CONSTRAINT "PK_ai_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_messages_session_id" FOREIGN KEY ("session_id")
          REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_messages_session_id" ON "ai_messages" ("session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_base_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "school_classes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schools"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "income_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "announcements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_registrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orphan_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "donations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "donation_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "member_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "phone_otp_verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mosque_imams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mosques"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "areas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sectors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "districts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provinces"`);
  }
}

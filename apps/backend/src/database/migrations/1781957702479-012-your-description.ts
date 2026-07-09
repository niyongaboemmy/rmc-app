import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaSync1781957702479 implements MigrationInterface {
  name = 'SchemaSync1781957702479';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_area_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_mosque_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role_id"`);
    await queryRunner.query(`ALTER TABLE "gallery_items" DROP CONSTRAINT "FK_gallery_uploaded_by"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_author"`);
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_category"`);
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_announcements_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_time_adjustments" DROP CONSTRAINT "FK_prayer_time_adj_mosque"`,
    );
    await queryRunner.query(`ALTER TABLE "mosques" DROP CONSTRAINT "FK_mosques_district_id"`);
    await queryRunner.query(`ALTER TABLE "mosques" DROP CONSTRAINT "FK_mosques_parent_mosque_id"`);
    await queryRunner.query(`ALTER TABLE "mosques" DROP CONSTRAINT "FK_mosques_province_id"`);
    await queryRunner.query(`ALTER TABLE "mosques" DROP CONSTRAINT "FK_mosques_sector_id"`);
    await queryRunner.query(
      `ALTER TABLE "mosque_imams" DROP CONSTRAINT "FK_mosque_imams_mosque_id"`,
    );
    await queryRunner.query(`ALTER TABLE "mosque_imams" DROP CONSTRAINT "FK_mosque_imams_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "member_profiles" DROP CONSTRAINT "FK_member_profiles_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" DROP CONSTRAINT "FK_marriage_documents_application"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_status_history" DROP CONSTRAINT "FK_marriage_status_history_application"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" DROP CONSTRAINT "FK_marriage_transactions_application"`,
    );
    await queryRunner.query(`ALTER TABLE "districts" DROP CONSTRAINT "FK_districts_province_id"`);
    await queryRunner.query(`ALTER TABLE "sectors" DROP CONSTRAINT "FK_sectors_district_id"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_areas_district_id"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_areas_sector_id"`);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_audit_log_actor_id"`);
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" DROP CONSTRAINT "FK_donation_campaigns_created_by"`,
    );
    await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_campaign_id"`);
    await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_donations_donor_id"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "phone_otp_verifications" DROP CONSTRAINT "FK_phone_otp_verifications_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_password_reset_tokens_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mosques_parent_mosque_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mosques_district_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mosques_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mosque_imams_mosque_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_mosque_imams_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_donations_is_active"`);
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" DROP CONSTRAINT "marriage_documents_document_type_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" DROP CONSTRAINT "marriage_applications_venue_type_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" DROP CONSTRAINT "marriage_applications_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" DROP CONSTRAINT "marriage_applications_payment_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" DROP CONSTRAINT "marriage_applications_payment_method_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" DROP CONSTRAINT "marriage_transactions_method_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" DROP CONSTRAINT "marriage_transactions_status_check"`,
    );
    await queryRunner.query(`ALTER TABLE "marriage_applications" DROP COLUMN "notification_email"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "UQ_roles_name"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "UQ_roles_slug"`);
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" ALTER COLUMN "verified" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ALTER COLUMN "mahr_currency" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_content" ALTER COLUMN "value" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_roles_name" ON "roles" ("name") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_roles_slug" ON "roles" ("slug") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_marriage_app_number" ON "marriage_applications" ("application_number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_2829ec24ec5af8ca797f76817ab" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD CONSTRAINT "FK_6a28a8ece8ce34b83cd82951098" FOREIGN KEY ("parent_mosque_id") REFERENCES "mosques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosque_imams" ADD CONSTRAINT "FK_4d6d69e54ae19131e6cc1aae17c" FOREIGN KEY ("mosque_id") REFERENCES "mosques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "member_profiles" ADD CONSTRAINT "FK_71f045ea73b7e7e39e6b6508db3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" ADD CONSTRAINT "FK_2de9acbbf56ee4a73b02cd1f1a6" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_status_history" ADD CONSTRAINT "FK_7046f2c58fb68b0bd0b5f220423" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" ADD CONSTRAINT "FK_8903d72f10c43df7ff70cb649a9" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" ADD CONSTRAINT "FK_9d451638507b11822dc411a2dfe" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sectors" ADD CONSTRAINT "FK_d3b63a9863908e4afc9f27884b1" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "areas" ADD CONSTRAINT "FK_8de9475163af998e54027495b83" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "areas" ADD CONSTRAINT "FK_0133ab4e71f1069d0db0655f2e5" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_6ad4405f42816956aa8a89bc9fb" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donations" DROP CONSTRAINT "FK_6ad4405f42816956aa8a89bc9fb"`,
    );
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_0133ab4e71f1069d0db0655f2e5"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_8de9475163af998e54027495b83"`);
    await queryRunner.query(
      `ALTER TABLE "sectors" DROP CONSTRAINT "FK_d3b63a9863908e4afc9f27884b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" DROP CONSTRAINT "FK_9d451638507b11822dc411a2dfe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" DROP CONSTRAINT "FK_8903d72f10c43df7ff70cb649a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_status_history" DROP CONSTRAINT "FK_7046f2c58fb68b0bd0b5f220423"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" DROP CONSTRAINT "FK_2de9acbbf56ee4a73b02cd1f1a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "member_profiles" DROP CONSTRAINT "FK_71f045ea73b7e7e39e6b6508db3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosque_imams" DROP CONSTRAINT "FK_4d6d69e54ae19131e6cc1aae17c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" DROP CONSTRAINT "FK_6a28a8ece8ce34b83cd82951098"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_2829ec24ec5af8ca797f76817ab"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_marriage_app_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_name"`);
    await queryRunner.query(`ALTER TABLE "site_content" ALTER COLUMN "value" SET DEFAULT '{}'`);
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ALTER COLUMN "mahr_currency" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" ALTER COLUMN "verified" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "UQ_roles_slug" UNIQUE ("slug")`);
    await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "UQ_roles_name" UNIQUE ("name")`);
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ADD "notification_email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" ADD CONSTRAINT "marriage_transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" ADD CONSTRAINT "marriage_transactions_method_check" CHECK (((method)::text = ANY ((ARRAY['momo'::character varying, 'bank'::character varying, 'cash'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ADD CONSTRAINT "marriage_applications_payment_method_check" CHECK (((payment_method)::text = ANY ((ARRAY['momo'::character varying, 'bank'::character varying, 'cash'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ADD CONSTRAINT "marriage_applications_payment_status_check" CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'pending_cash'::character varying, 'processing'::character varying, 'paid'::character varying, 'refunded'::character varying, 'failed'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ADD CONSTRAINT "marriage_applications_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'under_review'::character varying, 'amendments_requested'::character varying, 'approved'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'closed'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_applications" ADD CONSTRAINT "marriage_applications_venue_type_check" CHECK (((venue_type)::text = ANY ((ARRAY['mosque'::character varying, 'outside'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" ADD CONSTRAINT "marriage_documents_document_type_check" CHECK (((document_type)::text = ANY ((ARRAY['groom_id'::character varying, 'bride_id'::character varying, 'wali_consent'::character varying, 'mahr_agreement'::character varying, 'portrait'::character varying, 'additional'::character varying])::text[])))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_donations_is_active" ON "donations" ("is_active") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mosque_imams_user_id" ON "mosque_imams" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mosque_imams_mosque_id" ON "mosque_imams" ("mosque_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_mosques_status" ON "mosques" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_mosques_district_id" ON "mosques" ("district_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mosques_parent_mosque_id" ON "mosques" ("parent_mosque_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_roles_slug" ON "roles" ("slug") `);
    await queryRunner.query(`CREATE INDEX "IDX_roles_name" ON "roles" ("name") `);
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_password_reset_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "phone_otp_verifications" ADD CONSTRAINT "FK_phone_otp_verifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_donor_id" FOREIGN KEY ("donor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donations" ADD CONSTRAINT "FK_donations_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_campaigns" ADD CONSTRAINT "FK_donation_campaigns_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "FK_audit_log_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "areas" ADD CONSTRAINT "FK_areas_sector_id" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "areas" ADD CONSTRAINT "FK_areas_district_id" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sectors" ADD CONSTRAINT "FK_sectors_district_id" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" ADD CONSTRAINT "FK_districts_province_id" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_transactions" ADD CONSTRAINT "FK_marriage_transactions_application" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_status_history" ADD CONSTRAINT "FK_marriage_status_history_application" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "marriage_documents" ADD CONSTRAINT "FK_marriage_documents_application" FOREIGN KEY ("application_id") REFERENCES "marriage_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "member_profiles" ADD CONSTRAINT "FK_member_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosque_imams" ADD CONSTRAINT "FK_mosque_imams_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosque_imams" ADD CONSTRAINT "FK_mosque_imams_mosque_id" FOREIGN KEY ("mosque_id") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD CONSTRAINT "FK_mosques_sector_id" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD CONSTRAINT "FK_mosques_province_id" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD CONSTRAINT "FK_mosques_parent_mosque_id" FOREIGN KEY ("parent_mosque_id") REFERENCES "mosques"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mosques" ADD CONSTRAINT "FK_mosques_district_id" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_time_adjustments" ADD CONSTRAINT "FK_prayer_time_adj_mosque" FOREIGN KEY ("mosque_id") REFERENCES "mosques"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_announcements_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_blog_posts_category" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_blog_posts_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "gallery_items" ADD CONSTRAINT "FK_gallery_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_mosque_id" FOREIGN KEY ("mosque_id") REFERENCES "mosques"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_area_id" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}

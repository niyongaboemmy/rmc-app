import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dawah Learning — the data foundation for a public catalogue of Islamic
 * courses and a digital library of books (docs/dawah-learning-implementation-plan.md §4).
 *
 * Four tables, one shared taxonomy: `dawah_categories` serves both courses and
 * books, because a "Fiqh" category must mean the same thing on both pages.
 * Modelled on blog_categories; the ordered / activatable / soft-deletable shape
 * is the one hajj_requirements and hajj_bank_accounts (048, 051) already use.
 *
 * Courses and books are real tables rather than `site_content` jsonb because
 * they need slugs, detail routes, category filtering, search, pagination and
 * publish state — all query problems a jsonb blob cannot answer. Only the
 * landing hero and description stay in the CMS.
 *
 * Tri-lingual text is sibling columns (title_en / title_rw / title_ar), English
 * required and the other two NOT NULL DEFAULT '', exactly as hajj_requirements
 * does it. The platform's locales are en / rw / ar. There is no translations
 * table by design — the UI falls back to English until a column is filled.
 *
 * NOTE on `dawah_course_lessons.content_type` / `media_key` / `media_url`:
 * nothing writes these yet. Media resources (video / audio) are deliberately
 * deferred, and these three columns ship now so that adding them later is
 * additive — new rows, not an ALTER of a populated table plus an API break.
 * They cost three nullable columns today. See plan §4.3. Do not "clean them up".
 */
export class DawahTables1786000000025 implements MigrationInterface {
  name = 'DawahTables1786000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Shared taxonomy ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dawah_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(80) NOT NULL,
        "name_en" varchar(120) NOT NULL,
        "name_rw" varchar(120) NOT NULL DEFAULT '',
        "name_ar" varchar(120) NOT NULL DEFAULT '',
        "icon" varchar(40),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dawah_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dawah_categories_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_categories_sort" ON "dawah_categories" ("sort_order")`,
    );

    // ── Courses ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dawah_courses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(140) NOT NULL,
        "category_id" uuid,
        "title_en" varchar(160) NOT NULL,
        "title_rw" varchar(160) NOT NULL DEFAULT '',
        "title_ar" varchar(160) NOT NULL DEFAULT '',
        "summary_en" varchar(300) NOT NULL,
        "summary_rw" varchar(300) NOT NULL DEFAULT '',
        "summary_ar" varchar(300) NOT NULL DEFAULT '',
        "description_en" text NOT NULL DEFAULT '',
        "description_rw" text NOT NULL DEFAULT '',
        "description_ar" text NOT NULL DEFAULT '',
        "level" varchar(20) NOT NULL DEFAULT 'beginner',
        "language" varchar(20) NOT NULL DEFAULT 'en',
        "format" varchar(20) NOT NULL DEFAULT 'self_paced',
        "cover_image_key" varchar(500),
        "instructor_name" varchar(150),
        "instructor_title" varchar(150),
        "instructor_photo_key" varchar(500),
        "duration_minutes" int,
        "lesson_count" int NOT NULL DEFAULT 0,
        "is_featured" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "sort_order" int NOT NULL DEFAULT 0,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dawah_courses" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dawah_courses_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_dawah_courses_category" FOREIGN KEY ("category_id")
          REFERENCES "dawah_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_dawah_course_level" CHECK ("level" IN ('beginner', 'intermediate', 'advanced')),
        CONSTRAINT "CHK_dawah_course_lang" CHECK ("language" IN ('en', 'rw', 'ar', 'multi')),
        CONSTRAINT "CHK_dawah_course_format" CHECK ("format" IN ('self_paced', 'in_person', 'hybrid')),
        CONSTRAINT "CHK_dawah_course_status" CHECK ("status" IN ('draft', 'published', 'archived'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_courses_status" ON "dawah_courses" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_courses_category" ON "dawah_courses" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_courses_featured" ON "dawah_courses" ("is_featured")`,
    );

    // ── Lessons ──────────────────────────────────────────────────────────────
    // A lesson is the natural home for a future video or audio khutbah, hence
    // content_type / media_key / media_url. Null until Phase 7. See §4.3.
    await queryRunner.query(`
      CREATE TABLE "dawah_course_lessons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "title_en" varchar(160) NOT NULL,
        "title_rw" varchar(160) NOT NULL DEFAULT '',
        "title_ar" varchar(160) NOT NULL DEFAULT '',
        "summary_en" text NOT NULL DEFAULT '',
        "summary_rw" text NOT NULL DEFAULT '',
        "summary_ar" text NOT NULL DEFAULT '',
        "body_en" text NOT NULL DEFAULT '',
        "body_rw" text NOT NULL DEFAULT '',
        "body_ar" text NOT NULL DEFAULT '',
        "content_type" varchar(20) NOT NULL DEFAULT 'text',
        "media_key" varchar(500),
        "media_url" varchar(500),
        "duration_minutes" int,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_preview" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dawah_course_lessons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dawah_course_lessons_course" FOREIGN KEY ("course_id")
          REFERENCES "dawah_courses"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_dawah_lesson_content_type"
          CHECK ("content_type" IN ('text', 'video', 'audio', 'pdf', 'link'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_course_lessons_course_sort" ON "dawah_course_lessons" ("course_id", "sort_order")`,
    );

    // ── Library ──────────────────────────────────────────────────────────────
    // file_key lives under the file-server's protected `dawah-library/` prefix,
    // so the only way to read a book is through the backend — which is where
    // the visibility / allow_download policy is enforced. cover_image_key lives
    // under the public `dawah-covers/` prefix and is served directly. See §6.
    await queryRunner.query(`
      CREATE TABLE "dawah_books" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(140) NOT NULL,
        "category_id" uuid,
        "title_en" varchar(200) NOT NULL,
        "title_rw" varchar(200) NOT NULL DEFAULT '',
        "title_ar" varchar(200) NOT NULL DEFAULT '',
        "author" varchar(160) NOT NULL DEFAULT '',
        "description_en" text NOT NULL DEFAULT '',
        "description_rw" text NOT NULL DEFAULT '',
        "description_ar" text NOT NULL DEFAULT '',
        "language" varchar(20) NOT NULL DEFAULT 'en',
        "cover_image_key" varchar(500),
        "file_key" varchar(500) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" varchar(100) NOT NULL DEFAULT 'application/pdf',
        "page_count" int,
        "preview_file_key" varchar(500),
        "visibility" varchar(20) NOT NULL DEFAULT 'public',
        "allow_download" boolean NOT NULL DEFAULT true,
        "view_count" int NOT NULL DEFAULT 0,
        "download_count" int NOT NULL DEFAULT 0,
        "is_featured" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "sort_order" int NOT NULL DEFAULT 0,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dawah_books" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dawah_books_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_dawah_books_category" FOREIGN KEY ("category_id")
          REFERENCES "dawah_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_dawah_book_lang" CHECK ("language" IN ('en', 'rw', 'ar', 'other')),
        CONSTRAINT "CHK_dawah_book_visibility" CHECK ("visibility" IN ('public', 'members')),
        CONSTRAINT "CHK_dawah_book_status" CHECK ("status" IN ('draft', 'published', 'archived'))
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_dawah_books_status" ON "dawah_books" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_dawah_books_category" ON "dawah_books" ("category_id")`,
    );

    // No category seed here: the launch taxonomy is a content decision RMC has
    // not made yet, and a guessed "Fiqh / Aqeedah / Seerah" list would show up
    // on the public filter bar as if it were theirs. The admin creates them.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: lessons and books both point at their parents.
    await queryRunner.query(`DROP TABLE "dawah_books"`);
    await queryRunner.query(`DROP TABLE "dawah_course_lessons"`);
    await queryRunner.query(`DROP TABLE "dawah_courses"`);
    await queryRunner.query(`DROP TABLE "dawah_categories"`);
  }
}

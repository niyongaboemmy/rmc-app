# Dawah Learning — Implementation Prompts

**Companion to:** [dawah-learning-implementation-plan.md](./dawah-learning-implementation-plan.md) — read that document (schema §4, API spec §5, preview mechanism §6) before running any prompt below.

**How to use this file.** Each prompt is **self-contained** — it restates the context it needs, so it can be pasted into a fresh Claude Code session or handed to a subagent without this conversation's history. Each is addressed to a **role**; the role tag tells you who owns it and what skills it assumes.

**Ordering.** Respect the dependency column. Within a track, order matters. Across tracks:

- **Prompt 6 (UI/UX) starts on day 1**, in parallel with everything — it has no code dependencies and it is an *input* to Prompts 8–12, not a review gate.
- Prompts 1–2 (Data) **block everything else**.
- Prompts 3–5 (Backend) can run while Prompt 6 is in flight.
- Prompts 7–12 (Frontend) need Prompts 1–6 landed.

Review the diff after each prompt before starting the next. Do not chain them blindly.

| # | Role | Deliverable | Depends on |
|---|---|---|---|
| 1 | 🗄️ Data Expert | Migration + entities | — |
| 2 | 🗄️ Data Expert | Permissions, role grants, seeds | 1 |
| 3 | ⚙️ Senior Backend | Category + Course services, DTOs | 1 |
| 4 | ⚙️ Senior Backend | Public + Admin catalogue controllers | 3 |
| 5 | ⚙️ Senior Backend | File pipeline: protected prefix, upload, preview/download | 1 |
| 6 | 🎨 UI/UX Expert | UX spec, wireframes, component inventory | — *(day 1, parallel)* |
| 7 | 💻 Senior Frontend | API client, i18n scaffold, nav registration | 4, 5 |
| 8 | 💻 Senior Frontend | Landing page | 6, 7 |
| 9 | 💻 Senior Frontend | Courses list + detail | 6, 7 |
| 10 | 💻 Senior Frontend | Library + preview overlay | 6, 7 |
| 11 | 💻 Senior Frontend | Admin: courses + lesson builder | 6, 7 |
| 12 | 💻 Senior Frontend | Admin: library, categories, CMS landing | 6, 7 |
| 13 | 🧪 All roles | i18n · SEO · a11y · QA hardening | 8–12 |

---

## Prompt 1 — 🗄️ Data Expert — Schema Migration & Entities

```
You are a database engineer working in the RMC App backend (NestJS 10 +
TypeORM 0.3 + PostgreSQL, at apps/backend/). Read
docs/dawah-learning-implementation-plan.md §4 (Data model) in full — it
contains the exact SQL for four tables.

Task: lay the data foundation for a new "Dawah Learning" feature (a public
catalogue of Islamic courses and a digital library of books).

Your structural precedent is apps/backend/src/hajj/ — the newest and most
convention-correct module in the repo. Study these before writing anything:
  - apps/backend/src/database/migrations/051-hajj-bank-accounts.ts
  - apps/backend/src/hajj/entities/hajj-requirement.entity.ts
  - apps/backend/src/hajj/entities/hajj-document.entity.ts
Copy their conventions exactly. Do not invent new ones.

Conventions you MUST follow (these are house rules, not suggestions):
  - Migrations are RAW SQL via queryRunner.query(). Never the TypeORM
    query-builder / Table / TableColumn APIs.
  - File naming: NNN-kebab-description.ts, next sequential number after the
    highest currently in src/database/migrations/ (051 at time of writing —
    verify).
  - Class name ends in a hand-picked timestamp and the `name` property
    repeats it, e.g.
      export class DawahTables1786000000025 implements MigrationInterface {
        name = 'DawahTables1786000000025';
    TypeORM sorts by that value, not the filename.
  - Constraint naming: PK_<table>, IDX_<table>_<col>, CHK_<...>, UQ_<...>,
    FK_<table>_<ref>. UUID default is gen_random_uuid().
  - A long explanatory JSDoc block above the class saying WHY, referencing
    sibling migrations.
  - down() is ALWAYS implemented.
  - Entities: @PrimaryGeneratedColumn('uuid'); camelCase properties mapped to
    snake_case columns via { name: '...' }; created_at/updated_at as
    timestamptz via @CreateDateColumn/@UpdateDateColumn; soft delete via
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz',
    nullable: true }) where the plan specifies deleted_at.
  - Enums are declared as TS `export enum` IN the entity file and stored as
    varchar(20) with a CHECK constraint — never a Postgres enum type.
  - Tri-lingual text uses sibling columns title_en / title_rw / title_ar
    (English required; rw and ar NOT NULL DEFAULT ''). The platform's three
    locales are en, rw, ar. There is no French. There is no translations
    table — do not build one.

Do this:
1. Write ONE migration creating exactly the four tables from plan §4, with
   the exact columns, CHECK constraints, foreign keys, and indexes given
   there:
     - dawah_categories
     - dawah_courses
     - dawah_course_lessons
     - dawah_books
2. Create apps/backend/src/dawah/entities/ with four matching entity classes:
   dawah-category.entity.ts, dawah-course.entity.ts,
   dawah-course-lesson.entity.ts, dawah-book.entity.ts.
   Declare these enums in the relevant entity files: CourseLevel
   (beginner/intermediate/advanced), CourseFormat
   (self_paced/in_person/hybrid), ContentStatus (draft/published/archived),
   LessonContentType (text/video/audio/pdf/link), BookVisibility
   (public/members).
3. IMPORTANT — read plan §4.3 before you are tempted to "clean up" the lesson
   table. The columns content_type, media_key, and media_url ship NOW and
   stay null until a later phase. They are deliberate forward-compatibility
   for video/audio resources. Do not omit them.
4. Add a relation from DawahCourse to DawahCourseLesson (OneToMany, and the
   inverse ManyToOne with onDelete: 'CASCADE'), and ManyToOne from both
   DawahCourse and DawahBook to DawahCategory (onDelete: 'SET NULL'),
   following how apps/backend/src/drive/entities/drive-item.entity.ts:38-44
   declares the FK column and the relation side by side.
5. Scaffold a minimal apps/backend/src/dawah/dawah.module.ts (TypeOrmModule
   .forFeature with the four entities; empty providers/controllers for now)
   and register DawahModule in app.module.ts's imports array, near the other
   domain modules.
6. Verify: run `npm run migration:run --workspace=apps/backend` against the
   dev DB, confirm all four tables exist with the right columns and
   constraints (psql \d or an equivalent check), then run
   `npm run migration:revert` once to prove down() works, then re-apply.
   Report what you observed.

Do NOT implement services, controllers, DTOs, business logic, or any
frontend work. This prompt is schema + entities + scaffolding only.
```

---

## Prompt 2 — 🗄️ Data Expert — Permissions, Role Grants & Seed Data

```
You are a database engineer working in the RMC App backend (apps/backend/).
The Dawah entities and migration already exist from a prior step
(apps/backend/src/dawah/entities/, four tables: dawah_categories,
dawah_courses, dawah_course_lessons, dawah_books). Read
docs/dawah-learning-implementation-plan.md §5.3.

Task: register the feature's permissions, grant them to the right roles, and
seed the category taxonomy. No business logic.

Do this:
1. Add two entries to apps/backend/src/common/types/permissions.enum.ts,
   under a new `// ── Dawah Learning ──` section comment, matching the
   existing SCHOOLS_VIEW / SCHOOLS_MANAGE shape exactly:
     DAWAH_VIEW   = 'dawah:view',
     DAWAH_MANAGE = 'dawah:manage',
   (ALL_PERMISSIONS at the bottom of that file is derived with
   Object.values() — it picks these up automatically. Confirm that.)

2. Write a migration granting both permissions to the superadmin and admin
   ROLE ROWS. Copy the pattern in
   apps/backend/src/database/migrations/049-fix-hajj-good-conduct-permissions.ts
   VERBATIM, including the critical detail that it matches on `roles.slug`,
   NOT `roles.name`. Matching on name is a real bug this repo already shipped
   and had to fix with that very migration. The jsonb merge must be
   idempotent (re-running changes nothing).

3. Add the two permissions to ADMIN_PERMISSIONS in
   apps/backend/src/database/seeds/02-roles-admin.seed.ts, so a freshly
   seeded environment gets them too. (Both paths are needed: the migration
   fixes existing databases, the seed covers new ones.)

4. Write apps/backend/src/database/seeds/08-dawah-categories.seed.ts seeding
   the shared course/book taxonomy. Follow the existing seed conventions
   exactly: `export async function seedDawahCategories(dataSource: DataSource)
   : Promise<void>`, fully idempotent (find-then-update-or-create, so
   re-running is a no-op), and registered MANUALLY in
   src/database/seeds/run-seeds.ts (there is no auto-discovery).
   Seed these categories with tri-lingual names — provide English now and
   leave rw/ar as '' where you are not confident of the translation; the
   UI falls back to English by design, and a wrong Kinyarwanda or Arabic
   religious term is worse than an empty one that a human fills in later:
     quran-studies · hadith · fiqh · aqeedah · seerah · arabic-language ·
     new-muslims · family-life
   Give each a `sort_order` and a lucide-react `icon` name (e.g. 'BookOpen',
   'Scroll', 'Scale', 'Heart', 'Compass', 'Languages', 'Sparkles', 'Users').

5. Do NOT seed demo courses or books into the main seed chain — production
   runs these seeds. If you want fixture data for local development, put it
   in a clearly-named standalone script (not wired into run-seeds.ts) and say
   so in your report.

6. Verify: run the migration and `npm run seed`, then confirm
   (a) 'dawah:view' and 'dawah:manage' appear in GET /api/v1/roles/permissions,
   (b) the superadmin and admin role rows carry both in their permissions
       jsonb,
   (c) the categories exist and running the seed a second time changes
       nothing.
   Report the results.
```

---

## Prompt 3 — ⚙️ Senior Backend — Category & Course Services + DTOs

```
You are a senior backend engineer in the RMC App (NestJS 10 + TypeORM +
PostgreSQL, apps/backend/). The Dawah entities, migration, permissions, and
category seed already exist (apps/backend/src/dawah/entities/ — DawahCategory,
DawahCourse, DawahCourseLesson, DawahBook). Read
docs/dawah-learning-implementation-plan.md §4 and §5.

Task: implement the catalogue service layer + DTOs for categories, courses,
and lessons. Controllers come in the NEXT prompt — services and DTOs only here.

Your structural precedent is apps/backend/src/hajj/ (hajj.service.ts,
hajj-requirement.service.ts, and dto/). Read them first and match their style
exactly. Key house conventions:
  - Constructor-injected repos: @InjectRepository(X) private readonly xs:
    Repository<X>
  - Throw NotFoundException('Course not found') — plain, specific messages.
  - Services return entities/plain objects directly; a global
    TransformInterceptor wraps everything in { success, data, timestamp }.
    Do NOT hand-roll that envelope.
  - remove() returns { id }.
  - Every DTO field carries @ApiProperty()/@ApiPropertyOptional() AND
    class-validator decorators. Optional fields are @IsOptional() + `field?: T`.
  - Update DTOs: `export class UpdateXDto extends PartialType(CreateXDto) {}`
    importing PartialType from '@nestjs/swagger' (NOT @nestjs/mapped-types).
  - The global ValidationPipe uses whitelist + forbidNonWhitelisted, so any
    body field not declared on the DTO returns 400. Declare everything.
  - Tri-lingual fields: *_en is required in create DTOs; *_rw and *_ar are
    @IsOptional() and the SERVICE defaults them to '' before insert (see
    hajj-requirement.service.ts:48-53).

Do this:
1. dawah-category.service.ts — listPublic() (active only, sorted by
   sort_order), adminList(), findOne(id), create(dto), update(id, dto),
   remove(id) (soft delete).

2. dawah-course.service.ts:
   - A slug generator: slugify the English title, lowercase, strip diacritics,
     collapse to hyphens; on collision append -2, -3, … Slugs are immutable
     once a course is published (changing a published slug breaks inbound
     links and SEO) — enforce that in update(): if status is 'published' and
     the incoming payload would change the slug, ignore the change. Comment
     WHY at that line.
   - listPublic(query): status='published' ONLY. Filters: category (slug or
     id), level, language, search. Search with ILIKE across title_en/rw/ar +
     summary_en. Build with createQueryBuilder + andWhere, using
     `new Brackets(...)` for the OR group — see hajj.service.ts:150-163.
     Paginate: skip/take + getManyAndCount, returning
     { items, total, page, limit } (the newer of the repo's two pagination
     shapes — use this one, not the members.service.ts { data, pages } shape).
   - listFeatured(): published + is_featured, sorted by sort_order, capped
     at 6. This drives the landing page's "outline of courses".
   - findBySlugPublic(slug): the course + its lessons ordered by sort_order.
     404 if not published.
   - adminList(query) — same filters, but ALL statuses.
   - create / update / remove (soft delete) / setStatus(id, status).
     setStatus stamps published_at the first time it transitions to
     'published', and leaves it alone thereafter.

3. Lesson operations (same service or a small dawah-lesson.service.ts, your
   call — justify it in a comment):
   addLesson(courseId, dto), updateLesson(id, dto), removeLesson(id) (HARD
   delete — lessons have no deleted_at; the plan's schema is deliberate),
   reorderLessons(courseId, ids: string[]).
   - reorderLessons must run in a TRANSACTION and validate that `ids` is
     exactly the set of that course's lesson ids — no additions, no
     omissions. A partial reorder silently corrupting the outline is the
     bug to prevent here.
   - Any mutation that changes a course's lesson set must update the
     denormalised dawah_courses.lesson_count in the SAME transaction. Do not
     let it drift.

4. DTOs in apps/backend/src/dawah/dto/: create/update for category, course,
   and lesson; plus QueryCoursesDto with @IsOptional() category?, level?,
   language?, search? (@MaxLength(150)), page? (@Type(() => Number) @IsInt()
   @Min(1), default 1), limit? (@IsInt() @Min(1) @Max(100), default 20) —
   modelled on hajj/dto/query-hajj-applications.dto.ts:5-28. Also
   ReorderLessonsDto { ids: string[] }.

5. Register the services as providers in dawah.module.ts and export them.

6. Verify with a quick script or `npm run test --workspace=apps/backend` if
   you add unit tests: create a course, add 3 lessons, reorder them, confirm
   lesson_count is 3 and the order persisted; confirm a draft course is
   invisible to listPublic().

Do NOT write controllers, file-upload code, or frontend work in this prompt.
```

---

## Prompt 4 — ⚙️ Senior Backend — Public & Admin Catalogue Controllers

```
You are a senior backend engineer in the RMC App (apps/backend/). The Dawah
entities and services already exist (apps/backend/src/dawah/ — see
dawah-course.service.ts, dawah-category.service.ts). Read
docs/dawah-learning-implementation-plan.md §5 (API surface) — it has the
complete route table.

Task: expose the catalogue over HTTP with the repo's two-controller split.
Book FILE routes (upload/preview/download) are a SEPARATE prompt — skip them
here; implement only the book CRUD/list/detail routes that don't stream bytes.

Precedent to copy exactly: apps/backend/src/hajj/hajj.controller.ts (public)
and hajj-admin.controller.ts (admin), plus apps/backend/src/schools/ for the
simpler CRUD shape.

Critical house rules:
  - Guards are GLOBAL APP_GUARDs (JwtAuthGuard + RolesGuard +
    PermissionsGuard) registered in app.module.ts. This means EVERY route is
    authenticated by default. Do NOT add @UseGuards() anywhere.
      · Public routes: @Public() on each handler.
      · Admin routes: @ApiBearerAuth() on the class + @Permissions(...) on
        each handler. That alone gates it.
  - Two controllers: @Controller('dawah') public, @Controller('admin/dawah')
    admin. Both share the same services.
  - @ApiTags('Dawah — Public') / @ApiTags('Dawah — Admin'). The em-dash is
    the house style.
  - ROUTE ORDERING: literal paths MUST be declared BEFORE parameterised ones.
    `@Get('courses/featured')` must appear above `@Get('courses/:slug')`, or
    the param pipe swallows 'featured'. This repo has hit this bug twice —
    see the comments at hajj-admin.controller.ts:60 and :143. Add a brief
    comment where it matters.
  - @Param('id', ParseUUIDPipe) for uuid params. Slugs are plain strings.
  - @Query() query: QueryCoursesDto — a validated DTO, not loose @Query('x')
    params.

Do this:
1. dawah.controller.ts — @Controller('dawah'), every handler @Public():
     GET /dawah/categories
     GET /dawah/courses            (@Query() QueryCoursesDto → paginated)
     GET /dawah/courses/featured   ← BEFORE :slug
     GET /dawah/courses/:slug
     GET /dawah/books              (@Query() QueryBooksDto → paginated)
     GET /dawah/books/featured     ← BEFORE :slug
     GET /dawah/books/:slug
   PUBLIC RESPONSE NARROWING — this matters: the public book detail response
   must NEVER include file_key or preview_file_key. Those are storage keys
   for a PROTECTED file-server prefix; leaking them tells an attacker exactly
   what to request. Map to an explicit public DTO/shape that omits them, the
   way hajj.controller.ts:78-115 hand-narrows its public response (and
   comments why). Expose instead: hasPreview: boolean, allowDownload: boolean,
   visibility, and the cover image key (covers ARE public).

2. dawah-admin.controller.ts — @Controller('admin/dawah'), @ApiBearerAuth():
     categories: GET / POST / PATCH :id / DELETE :id
     courses:    GET / POST / GET :id / PATCH :id / DELETE :id
                 PATCH courses/:id/status
     lessons:    POST courses/:id/lessons
                 PATCH lessons/:id
                 DELETE lessons/:id
                 POST courses/:id/lessons/reorder
     books:      GET / POST / GET :id / PATCH :id / DELETE :id
   Reads use @Permissions(Permission.DAWAH_VIEW); every write uses
   @Permissions(Permission.DAWAH_MANAGE).

3. Register both controllers in dawah.module.ts.

4. Add @ApiOperation({ summary: '...' }) to every handler — Swagger at
   /api/docs is how the frontend engineer will discover this API, so the
   summaries are load-bearing, not decoration.

5. Verify: boot the backend and confirm at http://localhost:3000/api/docs
   that every route above appears under the two Dawah tags. Then check with
   curl:
     - anonymous GET /api/v1/dawah/courses returns 200 and contains ONLY
       published courses (create a draft one and confirm it is absent)
     - anonymous GET /api/v1/dawah/courses/featured returns the featured set
       (NOT a "course not found" error — that would mean the route ordering
       is wrong)
     - anonymous GET /api/v1/admin/dawah/courses returns 401
     - a book detail response contains NO fileKey field
   Report the actual curl output.
```

---

## Prompt 5 — ⚙️ Senior Backend — File Pipeline: Upload, Preview & Download

```
You are a senior backend engineer in the RMC App (apps/backend/, plus the
separate apps/file-server/ service on port 3002). The Dawah entities and
services exist. Read docs/dawah-learning-implementation-plan.md §6 in full —
it is the design spec for this prompt and it explains the trade-offs.

Context you need:
  - apps/file-server/ serves files at GET /api/v1/files/:key(*). It has a
    PROTECTED-PREFIX mechanism: apps/file-server/src/common/guards/
    jwt-auth.guard.ts:24 defines DEFAULT_PROTECTED_PREFIXES =
    ['hajj-proofs/', 'funeral-docs/'], overridable via the
    PROTECTED_KEY_PREFIXES env var. A key under a protected prefix requires a
    JWT EVEN ON the otherwise-public serve route.
  - apps/backend/src/integrations/storage/public-upload.service.ts is the
    backend-mediated upload path: PublicUploadService.upload(file, folder) →
    { fileKey, fileName, fileSize, mimeType }, and .fetch(fileKey) →
    { buffer, mimeType }. Import PublicUploadModule directly — it is NOT in
    the IntegrationsModule barrel.
  - The streaming precedent is apps/backend/src/hajj/hajj-admin.controller.ts
    :175-196 (GET /admin/hajj/documents/:docId/file) — @Res(), inline
    Content-Disposition, Cache-Control: private, no-store. Copy it.

The design in one line: book PDFs live under the PROTECTED prefix
`dawah-library/`, so the ONLY way to read one is through the backend — which
is exactly where the visibility / download policy lives. Cover images live
under `dawah-covers/` (unprotected) so <img src> works directly.

Do this:
1. Add 'dawah-library/' to the protected prefixes — IN CODE, by appending it
   to DEFAULT_PROTECTED_PREFIXES in
   apps/file-server/src/common/guards/jwt-auth.guard.ts:24.

   ⛔ DO NOT do this with the PROTECTED_KEY_PREFIXES env var. Read lines 36-39
   of that guard: the env var OVERRIDES the defaults, it does not append to
   them:
       const configured = config.get<string>('PROTECTED_KEY_PREFIXES');
       prefixes = configured ? configured.split(',') : DEFAULT_PROTECTED_PREFIXES;
   The var is currently UNSET, so the service runs on the code defaults
   ['hajj-proofs/', 'funeral-docs/']. Setting it to 'dawah-library/' would
   REPLACE those — silently un-protecting every Hajj payment proof and funeral
   document in the system. Nothing would look broken. It would just be a
   breach.

   Add a comment above the constant stating that any deployment which does set
   PROTECTED_KEY_PREFIXES must enumerate ALL prefixes, because it overrides.

2. GUARD AGAINST THE SILENT FAILURE. If a protected prefix goes missing from
   the resolved list, the files under it become publicly downloadable by raw
   URL and NOTHING LOOKS BROKEN — no error, no failed request, no alert. That
   is the worst failure mode in this feature. Add a startup assertion in the
   file-server's bootstrap (it is the service that resolves the list, so it is
   the only place that can actually see the truth) that logs a loud,
   unmissable ERROR if ANY expected prefix — 'hajj-proofs/', 'funeral-docs/',
   'dawah-library/' — is absent from the active set. Check all three, not just
   the new one: that way this class of mistake is caught however it is
   introduced, including by someone else's future change.

3. POST /admin/dawah/books/upload — @Permissions(Permission.DAWAH_MANAGE),
   @ApiConsumes('multipart/form-data'), @UseInterceptors(FileInterceptor
   ('file', { limits: { fileSize: 25 * 1024 * 1024 } })). Accept
   application/pdf ONLY (validate the mime type; do not trust the extension).
   Forward to PublicUploadService.upload(file, 'dawah-library'). Return
   { fileKey, fileName, fileSize, mimeType }.
   The 25 MB cap is deliberate — PublicUploadService.fetch() buffers the
   whole file in memory, so a 100 MB book would spike the backend. Enforce
   the cap; do not raise it without switching to a streaming pipe.

4. Cover images: POST /admin/dawah/books/:id/cover (and the equivalent for
   course covers) uploading to the 'dawah-covers' folder — OR confirm the
   frontend can upload covers directly to the file-server via the existing
   ImageUploadField widget (apps/frontend/src/components/ui/
   ImageUploadField.tsx, which POSTs to the file-server and returns a
   resolved URL). Prefer the existing widget if it works; if you do, write
   NO new endpoint and say so. Do not build a second upload path for no
   reason.

5. GET /dawah/books/:slug/preview — @Public(), @Res(). Resolution order,
   exactly as in plan §6:
     1. book not found OR status != 'published'   → 404
     2. preview_file_key set                      → stream it (anonymous OK)
     3. visibility = 'public'                     → stream file_key
     4. visibility = 'members' AND caller authed  → stream file_key
     5. otherwise                                 → 401
   Note the subtlety in step 4: the route is @Public(), so the JwtAuthGuard
   does not populate the user. You need to resolve the OPTIONAL identity of
   the caller yourself (decode the bearer token if present, treat absence as
   anonymous). Look at how the codebase handles optional auth elsewhere; if
   there is no precedent, implement it in the service cleanly and document
   the approach in a comment.
   Stream with Content-Type: application/pdf, Content-Disposition: inline;
   filename="...", Cache-Control: private, no-store. Increment view_count
   (best-effort, non-blocking — a counter failure must never break the read).

6. GET /dawah/books/:slug/download — @Public(), @Res(). Same identity
   resolution. Returns 403 if allow_download = false; 401 if visibility =
   'members' and the caller is anonymous. Otherwise streams the FULL file_key
   with Content-Disposition: attachment. Increments download_count.

7. GET /admin/dawah/books/:id/file — @Permissions(DAWAH_VIEW), inline stream
   of the full file regardless of visibility, so an admin can proof a book
   before publishing it.

8. Verify — and paste the actual output for each:
   (a) curl the file-server directly for a raw dawah-library key with no auth:
       GET http://localhost:3002/api/v1/files/dawah-library/<key>
       → MUST be 401. If this returns the PDF, the protected prefix is not
       active and the whole design is void. Check this FIRST.
   (b) a 'public' book: anonymous /preview → 200 application/pdf
   (c) a 'members' book with no preview_file_key: anonymous /preview → 401;
       with a valid bearer token → 200
   (d) a 'members' book WITH preview_file_key: anonymous /preview → 200 and
       returns the EXCERPT, not the full file
   (e) allow_download=false: /download → 403
   (f) a 30 MB upload → rejected
   (g) temporarily remove 'dawah-library/' from DEFAULT_PROTECTED_PREFIXES and
       boot → the startup assertion from step 2 fires loudly. Put it back.
   (h) confirm hajj-proofs/ and funeral-docs/ are STILL protected after your
       change — you must not have regressed them. Fetch a raw hajj-proofs key
       with no auth and confirm it is still 401.
```

---

## Prompt 6 — 🎨 UI/UX Expert — Experience Spec, Wireframes & Component Inventory

> **Start this on day 1, in parallel with the backend work.** It has no code
> dependencies, and it is an *input* to Prompts 8–12 — two frontend engineers
> will be blocked on it if it is treated as a final review gate instead of an
> upstream deliverable.

```
You are a senior UI/UX designer working on the RMC (Rwanda Muslim Community)
digital platform — an existing, live Next.js 14 + Tailwind product with a
mature visual language. Read docs/dawah-learning-implementation-plan.md §7.

Your job is NOT to invent a new design system. It is to extend an existing one
faithfully, and to hand two frontend engineers a spec precise enough that they
never have to guess. Every element you specify must map to an existing token
or component, or be explicitly flagged as new-and-why.

STUDY THE EXISTING LANGUAGE FIRST (read these files):
  - apps/frontend/tailwind.config.ts — the palette:
      rmc-green #1A7A4A · rmc-green-dark #145C38 · rmc-green-light #E8F5EE ·
      rmc-green-deep #0D3D24 · rmc-gold #D4A017 · rmc-dark #0A1628
  - apps/frontend/src/app/globals.css — ~700 lines of custom utilities:
      .pattern-islamic (star lattice, for dark heroes), .pattern-light,
      .card-hover, .glass, .text-gradient-gold, .reveal / .reveal-left /
      .reveal-right, .ornament-divider, .skeleton, .hero-blob
  - apps/frontend/src/components/layout/PageHero.tsx — THE shared secondary-
    page hero (crossfading photos, gold-dot eyebrow pill, optional ornament
    divider). Every public page uses it.
  - apps/frontend/src/components/home/AreasOfInterventionSection.tsx:23-100 —
    the premium card grid: ghosted index numeral (-webkit-text-stroke),
    gradient icon tile with a gold ring, gold hairline under the title, hover
    lift + green glow shadow, staggered scroll-reveal.
  - apps/frontend/src/components/schools/SchoolsPageClient.tsx — the simpler
    hero + 3-up feature card page. The closest existing analogue to the Dawah
    landing page.
  - apps/frontend/src/app/[locale]/admin/schools/page.tsx — the canonical
    admin CRUD layout (header with icon tile, filter bar, rounded-2xl table
    card, modal forms).
  - apps/frontend/src/components/drive/FilePreview.tsx and
    apps/frontend/src/app/[locale]/tenders/[id]/page.tsx:280-380 — the two
    EXISTING file-preview overlays. The Library viewer must be a sibling of
    these, not a third independent invention.

HARD CONSTRAINTS (violating these means the spec cannot be built):
  - Fonts: Poppins (--font-latin) for en/rw; Noto Naskh Arabic (--font-arabic)
    for ar. Both already wired.
  - THREE locales: en, rw, ar. Arabic is RTL (<html dir="rtl">). Kinyarwanda
    and Arabic strings run LONGER than English — design for text expansion,
    do not design to English string lengths.
  - THERE IS NO DARK MODE. next-themes is installed but never imported and
    the Tailwind config has no darkMode key. Do NOT specify dark: variants.
  - Shape language: cards rounded-2xl / rounded-3xl, border-gray-100,
    shadow-sm ring-1 ring-black/5. Admin inputs and buttons rounded-xl.
    Page container: mx-auto max-w-7xl px-4 sm:px-6 lg:px-8. Sections
    py-10 md:py-14.
  - Icons: lucide-react only.
  - There is NO DataTable, Pagination, Tabs, Tooltip, Card, or Skeleton
    primitive. There IS: Button, Input, Textarea, Select, SearchableSelect,
    Modal (+ConfirmModal), Toast, Alert, Badge/StatusBadge, Spinner,
    FormField, ImageUploadField, RichTextEditor (TipTap), Reveal.

DELIVER (as a markdown doc at docs/dawah-learning-ux-spec.md, with ASCII or
mermaid wireframes — do not produce image files):

1. WIREFRAMES, annotated, for all five public views:
   - /dawah landing: hero → description section → "outline of courses" →
     CTA into Courses and Library
   - /dawah/courses: filter bar + course card grid + pagination
   - /dawah/courses/[slug]: detail — instructor, meta strip (level, language,
     duration, lesson count), rich description, LESSON OUTLINE ACCORDION
   - /dawah/library: filters + book card grid
   - Book preview overlay: full-screen PDF reader
   and for the four admin views (courses list, lesson builder with drag-
   reorder, library list with cover + PDF upload, CMS landing editor).

2. THE COURSE CARD and THE BOOK CARD, specified to the pixel: exact Tailwind
   classes, which fields appear (a book card shows cover, title, author,
   category, language; a course card shows cover, title, summary, level
   badge, lesson count, duration), the hover state, and how each degrades
   when the cover image is MISSING (this will happen constantly in the first
   months — a broken-image card is the most likely visible defect in the
   whole feature, so design the fallback properly, don't hand-wave it).

3. EVERY STATE for every view — do not skip these, they are where features
   actually rot:
     loading · empty ("no courses match your filters" ≠ "no courses exist
     yet" — these are different screens and need different copy) · error ·
     no-permission (admin) · RTL mirrored · a book that is members-only and
     the visitor is anonymous ("Sign in to read" card) · a book with
     allow_download=false (Download button ABSENT, not disabled — a disabled
     button invites a support ticket).

4. THE BOOK PREVIEW OVERLAY, in detail. This is the feature's centrepiece
   ("preview content on the page"). Specify: how it opens, the toolbar
   (zoom, page nav, download-if-allowed, open-in-new-tab, close), the focus
   trap, Esc-to-close, body-scroll lock, the mobile behaviour (a full-screen
   PDF iframe on a 360px phone is genuinely hard — solve it, or explicitly
   specify a "open in new tab" fallback below a breakpoint and justify it),
   and the loading state while a 20 MB PDF streams.

5. COMPONENT INVENTORY — a table: every UI element in your wireframes →
   which EXISTING primitive covers it, or NEW and why nothing existing fits.
   Be ruthless here. The engineers will build exactly what this table says.

6. THE i18n / RTL SPEC: which strings are message-file keys (static UI chrome)
   vs tri-lingual DB columns (course titles, book titles) vs CMS jsonb
   (hero, description). Name the message namespaces (`dawah`, `admin.dawah`)
   and list every key. Flag every element that must mirror under RTL.

Do NOT write production code. Deliver the spec document, plus small inline
JSX/Tailwind sketches where a class list communicates faster than prose.
```

---

## Prompt 7 — 💻 Senior Frontend — API Client, i18n Scaffold & Navigation

```
You are a senior frontend engineer in the RMC App (Next.js 14 App Router,
Tailwind, next-intl, at apps/frontend/). The Dawah backend API is live —
browse it at http://localhost:3000/api/docs under the "Dawah — Public" and
"Dawah — Admin" tags. Read docs/dawah-learning-implementation-plan.md §5
(API surface) and §7.3 (registration checklist).

Task: build the plumbing every subsequent Dawah frontend prompt depends on.
No pages yet.

House conventions (follow exactly — do not introduce new patterns):
  - There is NO react-query in use. @tanstack/react-query is in package.json
    but `grep -rn "useQuery" src` returns ZERO hits. Data fetching is: axios
    service modules in src/lib/*Api.ts, called from 'use client' components
    with useState/useEffect/useCallback, or from async Server Components.
    Do NOT introduce react-query.
  - src/lib/api.ts exports `apiClient` (axios, attaches the bearer token from
    localStorage, handles 401 refresh) and `fileUrl(key)` →
    `${FILE_SERVER_URL}/api/v1/files/${key}`.
  - Public/unauthenticated reads use a SEPARATE axios instance that never
    attaches a token — see src/lib/public-api.ts:3-5.
  - There is NO shared types barrel. src/types/ contains only css.d.ts. Types
    live NEXT TO their service, exported from the same file.
  - The API envelope is { success, data, timestamp }; the unwrapping idiom is
    `data.data ?? data`.

Do this:
1. src/lib/dawahApi.ts — modelled EXACTLY on src/lib/schoolsApi.ts (the
   cleanest service in the repo): export the types from this file, and a
   single namespaced object splitting public from admin:

     export const dawahApi = {
       categories: () => ...,
       courses: { list(query), featured(), bySlug(slug) },
       books:    { list(query), featured(), bySlug(slug),
                   previewUrl(slug), downloadUrl(slug) },
       admin: {
         categories: { list, create, update, remove },
         courses:    { list, get, create, update, remove, setStatus },
         lessons:    { add, update, remove, reorder },
         books:      { list, get, create, update, remove, upload },
       },
     };

   Export TS types mirroring the API: DawahCategory, DawahCourse,
   DawahCourseLesson, DawahBook, CourseLevel, CourseFormat, ContentStatus,
   BookVisibility, plus CoursesQuery and a Paginated<T> = { items: T[];
   total: number; page: number; limit: number }.

   IMPORTANT — book file access: previewUrl(slug) and downloadUrl(slug) return
   BACKEND urls (`${API_BASE_URL}/dawah/books/${slug}/preview`), NOT
   fileUrl(...) file-server urls. Book PDFs live under a PROTECTED file-server
   prefix and are only readable through the backend, which enforces the
   visibility/download policy. Cover images DO use fileUrl(key) — they are
   public. Write a short comment in the file stating this distinction, because
   it is exactly the thing a future engineer will "fix" by mistake.

2. src/lib/content/dawah.ts — the CMS content module for the landing page's
   hero + description. Copy the shape of src/lib/content/hajj.ts or
   funeral.ts: a tri-lingual `Tri = { en, rw, ar }` typed interface plus a
   DAWAH_DEFAULT constant (seeded English copy, rw/ar as ''). Add
   `dawah: 'dawah'` to ContentKeys in src/lib/content/client.ts:34.

3. Frontend permission mirror: add DAWAH_VIEW = 'dawah:view' and
   DAWAH_MANAGE = 'dawah:manage' to the Permission enum in
   src/lib/permissions.ts.

4. Navigation registration:
   - Public: add a `nav.dawah` key to ALL THREE of src/messages/en.json,
     rw.json, ar.json, and a navLinks entry in
     src/components/layout/Navbar.tsx:82.
   - Admin: add a NAV_ITEMS entry in src/components/admin/AdminSidebar.tsx:28
     — { key, href: '/admin/dawah/courses', icon: <a lucide icon>,
     labelKey: 'sidebar.dawah', permission: Permission.DAWAH_VIEW,
     group: 'content' } — plus the `admin.sidebar.dawah` message in all three
     files.

5. Create the `dawah` and `admin.dawah` message namespaces in all three of
   src/messages/{en,rw,ar}.json, with the full key set from the UX spec
   (docs/dawah-learning-ux-spec.md §6). Write real English. For rw and ar,
   copy the English values as placeholders ONLY IF the UX spec has not
   supplied translations — and list every placeholder key in your final report
   so the translation pass in a later phase knows exactly what to fill. Do not
   silently leave them English and call it done.

6. Verify: the Dawah link appears in the public navbar in all three locales;
   the admin sidebar shows Dawah for a user with dawah:view and hides it
   otherwise; `dawahApi.courses.list({})` returns live data from a scratch
   page or the browser console. Report what you saw.

Do NOT build any Dawah pages in this prompt.
```

---

## Prompt 8 — 💻 Senior Frontend — Dawah Landing Page

```
You are a senior frontend engineer in the RMC App (Next.js 14 App Router +
Tailwind + next-intl, apps/frontend/). src/lib/dawahApi.ts,
src/lib/content/dawah.ts, the `dawah` message namespace, and the navbar entry
all already exist from a prior step. Read
docs/dawah-learning-ux-spec.md (the wireframes and component inventory are
binding) and docs/dawah-learning-implementation-plan.md §7.

Task: build the public Dawah landing page at /[locale]/dawah — hero section,
description section, and an outline of courses.

Precedent to follow: src/app/[locale]/blog/page.tsx (a CMS-backed Server
Component) and src/components/schools/SchoolsPageClient.tsx (hero + card grid).
The premium card grid to emulate is
src/components/home/AreasOfInterventionSection.tsx:23-100.

Do this:
1. src/app/[locale]/dawah/page.tsx — an async Server Component with
   `export const dynamic = 'force-dynamic'` (it reads live CMS + API data).
   Composition, per the UX spec:
     <Navbar />
     <main>
       <PageHero eyebrow title subtitle ornament />   ← copy from CMS
       description section                            ← copy from CMS
       "Outline of courses" — the featured course grid, from
           dawahApi.courses.featured()
       CTA cards → /dawah/courses and /dawah/library
     </main>
     <Footer />
   Wrap each section in <Reveal>.

2. CMS copy comes from getSiteContent<DawahContent>(ContentKeys.dawah), which
   returns tri-lingual { en, rw, ar } values resolved with pick(tri, locale).
   CRITICAL: follow the fallback idiom in
   src/components/blog/blogData.ts:30-57 — wrap the fetch in try/catch and
   fall back to the seeded DAWAH_DEFAULT constant on ANY throw. The backend
   being unreachable must render the page with default copy, never a 500. The
   existing code comments this as "Backend unreachable — fall back"; do the
   same.

3. src/components/dawah/CourseCard.tsx — build it EXACTLY to the UX spec's
   card specification, including the missing-cover-image fallback (this WILL
   happen in production and a broken <img> is the likeliest visible defect in
   the feature). Reuse it in Prompt 9's listing page — write it once, here,
   properly.

4. i18n: every static string is a `dawah.*` message key via
   `await getTranslations('dawah')`. ZERO hardcoded English. Course titles and
   summaries come from the API already resolved per locale — do not translate
   them client-side.

5. RTL: the page must mirror correctly at /ar. The layout already sets
   <html dir="rtl"> and the Arabic font; your job is to make sure nothing
   is positioned with hardcoded left/right that breaks. Test it, don't assume.

6. Verify by actually loading the page in a browser at /en/dawah, /rw/dawah,
   and /ar/dawah. Confirm: the hero renders, the featured courses appear, the
   Arabic version mirrors and uses the Naskh font, no console errors, and the
   page still renders when the backend is stopped (the CMS fallback path).
   Report what you saw, including the backend-down case.
```

---

## Prompt 9 — 💻 Senior Frontend — Courses Listing & Course Detail

```
You are a senior frontend engineer in the RMC App (apps/frontend/).
src/lib/dawahApi.ts and src/components/dawah/CourseCard.tsx already exist.
Read docs/dawah-learning-ux-spec.md (binding) and
docs/dawah-learning-implementation-plan.md §5.1, §7.1.

Task: build /[locale]/dawah/courses (listings) and
/[locale]/dawah/courses/[slug] (details).

Do this:
1. /dawah/courses — a thin page.tsx (exports `metadata`) rendering a
   'use client' CoursesPageClient, following the
   src/components/schools/SchoolsPageClient.tsx shape.
     <PageHero /> → filter bar → CourseCard grid → pagination
   Filters: category, level, language, and a search box. Use SearchableSelect
   (src/components/ui/SearchableSelect.tsx) for the enums — it is the standard
   dropdown in this codebase.

   FILTER SERVER-SIDE, not client-side. The admin/schools page filters with a
   client-side useMemo because it loads every school at once; courses are
   paginated (the API returns { items, total, page, limit }), so filtering must
   go through the query params to the API. Debounce the search input ~300ms.
   Reflect the active filters in the URL query string so a filtered view is
   shareable and survives a refresh.

   There is NO Pagination primitive in this codebase — hand-roll one, matching
   the hand-rolled pagination already in src/app/[locale]/admin/members/page.tsx.

2. /dawah/courses/[slug] — an async Server Component (SEO matters here):
   - `generateMetadata({ params })` producing a real per-course title,
     description, and OpenGraph image (the course cover via fileUrl()).
   - Composition per the UX spec: PageHero → instructor + meta strip (level,
     language, duration, lesson count) → rich description → LESSON OUTLINE
     ACCORDION → related courses.
   - The rich description is HTML authored in TipTap. Render it with
     dangerouslySetInnerHTML — but ONLY after sanitising with
     isomorphic-dompurify, which is already a dependency. Find how the repo
     already renders TipTap HTML on a public page and match it; if it does NOT
     sanitise anywhere, sanitise here anyway and flag the gap in your report.
   - The lesson outline accordion is keyboard-accessible: real <button>
     triggers, aria-expanded, aria-controls. There is no Accordion primitive —
     build it as src/components/dawah/CourseOutline.tsx.
   - A course that is not published returns 404 from the API → render
     Next's notFound().

3. i18n: all chrome via the `dawah` namespace. Course content arrives from the
   API pre-resolved per locale. RTL must mirror.

4. Verify in a browser: filter by category and level and confirm the URL
   updates and a refresh preserves the filters; paginate past page 1;
   open a course detail page; expand every accordion item with the KEYBOARD
   only; view the page source and confirm the <title> and og: tags are
   per-course, not generic; check /ar. Report what you saw.
```

---

## Prompt 10 — 💻 Senior Frontend — Library & Book Preview Overlay

```
You are a senior frontend engineer in the RMC App (apps/frontend/).
src/lib/dawahApi.ts exists. Read docs/dawah-learning-ux-spec.md §4 (the
preview overlay spec — binding) and
docs/dawah-learning-implementation-plan.md §6 (how book files are actually
served — READ THIS, it is not obvious).

Task: build /[locale]/dawah/library — book listings with on-page content
preview. This is the centrepiece of the feature.

THE ONE THING TO GET RIGHT: book PDFs are NOT served from the file server.
They live under a PROTECTED file-server prefix (dawah-library/) and are only
readable through backend routes that enforce the access policy:
    GET /api/v1/dawah/books/:slug/preview    → inline PDF (or 401)
    GET /api/v1/dawah/books/:slug/download   → attachment (or 403 / 401)
Use dawahApi.books.previewUrl(slug) / downloadUrl(slug). Do NOT reach for
fileUrl() for a PDF — it will 401, and "fixing" it by making the prefix public
would silently expose every book. COVER IMAGES are different: they are public,
and DO use fileUrl(key).

The API tells you the policy per book: `hasPreview`, `allowDownload`,
`visibility` ('public' | 'members'). The response NEVER contains a file key —
that is deliberate; do not go looking for one.

Do this:
1. /dawah/library — thin page.tsx + 'use client' LibraryPageClient:
   PageHero → filters (category, language, search — server-side + debounced +
   URL-synced, same as the courses page) → BookCard grid → pagination.

2. src/components/dawah/BookCard.tsx — per the UX spec: cover, title, author,
   category, language badge. Handle the missing-cover case with the spec's
   fallback (a generated cover block — NOT a broken <img>). Clicking the card
   opens the preview overlay.

3. src/components/dawah/BookPreviewOverlay.tsx — the reader. Two existing
   overlays already do most of this; READ BOTH and extract rather than write a
   third from scratch:
     - src/components/drive/FilePreview.tsx:125-195 — full-screen createPortal
       overlay, Esc-to-close, body-scroll lock, zoom/rotate toolbar, PDF via
       <iframe src={url + '#toolbar=1'} />
     - src/app/[locale]/tenders/[id]/page.tsx:280-380 — the PUBLIC (unauthed)
       variant of the same idea
   Factor the shared shell (portal + Esc + scroll-lock + toolbar chrome) into
   one reusable component and have all three use it. If that refactor turns out
   to be riskier than it looks, say so and scope it down — but do not silently
   leave a third near-duplicate copy in the tree.

   The overlay must handle, per the UX spec:
     - loading state while a large PDF streams (this is the common case — a
       20 MB book on a Rwandan mobile connection is NOT instant; a blank white
       rectangle for 8 seconds reads as "broken")
     - 401 → a "Sign in to read this book" card with a link to /login?redirect=
     - allowDownload=false → the Download button is ABSENT (not disabled)
     - focus trap + Esc + restore focus to the triggering card on close
     - the mobile fallback the UX spec specifies below its breakpoint

4. /dawah/library/[slug] — a Server Component permalink with
   generateMetadata(), rendering the book detail + the same viewer inline. This
   is the shareable/indexable route; the overlay is the primary interaction.

5. i18n + RTL throughout, via the `dawah` namespace.

6. Verify in a browser, against real seeded books covering EVERY case:
   (a) a public book → preview opens and renders inline
   (b) a members-only book, logged OUT → the "Sign in to read" card
   (c) the same book, logged IN → it renders
   (d) a members-only book WITH a preview excerpt, logged out → the EXCERPT
       renders (not a 401, and not the full book)
   (e) allowDownload=false → no Download button anywhere
   (f) the overlay on a 360px-wide viewport
   (g) full keyboard operation: open, navigate, Esc, focus returns to the card
   Report each case with what you actually observed. If you did not test a
   case, say so — do not report it as passing.
```

---

## Prompt 11 — 💻 Senior Frontend — Admin: Courses & Lesson Builder

```
You are a senior frontend engineer in the RMC App (apps/frontend/).
src/lib/dawahApi.ts, the Permission enum entries (DAWAH_VIEW / DAWAH_MANAGE),
and the admin sidebar entry already exist. Read
docs/dawah-learning-ux-spec.md (admin wireframes — binding).

Task: build the admin UI for courses and their lesson outlines.

THE precedent to copy is src/app/[locale]/admin/schools/page.tsx (504 lines —
read it end to end before writing anything). Reproduce its anatomy:
  - <ProtectedRoute permissions={[Permission.DAWAH_VIEW]}> wrapping the page
  - const canManage = hasPermission(Permission.DAWAH_MANAGE) gating every
    New/Edit/Delete control — a dawah:view-only admin must see a READ-ONLY UI
  - header: icon tile (h-10 w-10 rounded-xl bg-rmc-green/10) + title + subtitle
    + Refresh and New buttons
  - filter bar with a search input and SearchableSelects
  - rounded-2xl bordered table card; loading = centred spinning RefreshCw;
    empty = centred icon + message
  - modal forms; shared field classes:
      inputClass = 'w-full rounded-xl border border-gray-200 px-3 py-2.5
                    text-sm outline-none focus:border-rmc-green/40
                    focus:ring-2 focus:ring-rmc-green/30'
      labelClass = 'mb-1.5 block text-xs font-medium text-gray-500'
  - useState per field (NOT react-hook-form — admin pages in this repo don't
    use it), then build the payload and call the API
  - i18n via useTranslations('admin.dawah'). NOTE: several admin pages in this
    repo are hardcoded English. Do NOT copy that habit — admin/schools is the
    correctly-internationalised example. Follow it.

Do this:
1. /[locale]/admin/dawah/courses — the list: search + category/level/status
   filters, table (cover thumb, title, category, level, lessons, status badge,
   updated), row actions (edit, manage lessons, publish/unpublish, delete).
   Use the existing StatusBadge for draft/published/archived.

2. The course create/edit modal. It is a BIG form — the UX spec specifies its
   sections. It must include:
   - EN / RW / AR language tabs for the tri-lingual fields (title, summary,
     description). Copy the tab pattern from
     src/app/[locale]/admin/content/blog/page.tsx:40-44 (LANGS, with
     dir: 'rtl' for ar).
   - RichTextEditor (src/components/ui/RichTextEditor.tsx) for the description,
     one per language. GOTCHA, documented in that component: its body is
     UNCONTROLLED after mount — you MUST remount it with a `key` (the active
     language) when switching tabs, or you will silently write the English
     body into the Arabic column. This is a data-corruption bug, not a
     cosmetic one.
   - ImageUploadField (src/components/ui/ImageUploadField.tsx) for the cover
     and the instructor photo.
   - SearchableSelect for category / level / language / format.
   - A per-language completeness indicator (e.g. "AR: incomplete") so the
     content team can SEE which translations are missing — this is what stops
     half-translated courses reaching production unnoticed.

3. /[locale]/admin/dawah/courses/[id]/lessons — the lesson builder:
   - the ordered lesson list with drag-to-reorder (persist via
     dawahApi.admin.lessons.reorder(courseId, ids))
   - add / edit / delete a lesson, each with EN/RW/AR tabs (title, summary,
     body) and the same RichTextEditor remount-by-key rule
   - the lesson form has a `content_type` field. For now it is fixed to
     'text' — render the select with the other options (video/audio/pdf/link)
     DISABLED and labelled "coming soon". The backend columns already exist;
     this is the seam where media resources land in a later phase. Do not
     delete these options, and do not implement them.
   - optimistic reorder with a rollback on API failure — a reorder that
     silently fails and leaves the UI showing the new order is worse than one
     that visibly snaps back.

4. Use ConfirmModal (src/components/ui/Modal.tsx) for deletes and
   useToast() (src/components/ui/Toast.tsx) for success/error feedback.

5. Verify as BOTH an admin with dawah:manage and one with only dawah:view:
   the view-only user sees no New/Edit/Delete affordances anywhere and cannot
   reach the forms. Then, as a manager: create a course, fill all three
   languages, upload a cover, add 4 lessons, drag to reorder them, reload the
   page and confirm the order PERSISTED, publish the course, and confirm it
   appears on the public /dawah/courses page. Report each step.
```

---

## Prompt 12 — 💻 Senior Frontend — Admin: Library, Categories & CMS Landing Copy

```
You are a senior frontend engineer in the RMC App (apps/frontend/).
src/lib/dawahApi.ts, src/lib/content/dawah.ts, the Permission entries, and the
admin sidebar entry already exist. Read docs/dawah-learning-ux-spec.md and
docs/dawah-learning-implementation-plan.md §4.4 (the three fields that carry
the whole licensing policy) and §6.

Task: build the admin UI for the library, the shared category taxonomy, and
the CMS-managed landing copy.

Same precedent as the courses admin: src/app/[locale]/admin/schools/page.tsx
for CRUD, src/app/[locale]/admin/content/blog/page.tsx for the CMS editor.
<ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>; every write control
gated on hasPermission(Permission.DAWAH_MANAGE).

Do this:
1. /[locale]/admin/dawah/library — book CRUD.
   The create/edit form has TWO distinct uploads, and they are NOT the same
   mechanism — getting this wrong is the most likely bug in this prompt:
     - COVER IMAGE → use the existing ImageUploadField. Covers go to the
       public `dawah-covers/` folder and are rendered directly with fileUrl().
     - BOOK PDF → a NEW upload field posting to
       POST /api/v1/admin/dawah/books/upload (multipart, field name `file`,
       PDF only, 25 MB cap). This goes to the PROTECTED `dawah-library/`
       prefix and returns { fileKey, fileName, fileSize, mimeType }, which you
       submit with the book payload. Show upload progress — a 20 MB PDF on a
       slow link with no progress bar reads as a hang. Follow the raw-XHR +
       progress pattern already in src/lib/galleryApi.ts:183 and
       src/components/drive/UploadZone.tsx.
     - Optionally a SECOND PDF: the preview excerpt (preview_file_key), same
       upload endpoint.

   The form must expose the three policy fields clearly, with plain-language
   help text — an admin choosing these is making a LICENSING decision and the
   UI has to make the consequence legible:
     - visibility: public | members
     - allowDownload: boolean
     - preview file: optional excerpt, shown to anonymous visitors when the
       full book is members-only
   Write the help text so a non-technical RMC content officer understands what
   each one actually does to a visitor. Additionally: do not imply that
   allowDownload=false protects the file. It hides the download button and
   blocks the download endpoint; anyone who can read a PDF in a browser can
   save the bytes. If the UX spec's copy overstates this, fix the copy and say
   so.

2. Add an admin "proof" action per book that opens
   GET /api/v1/admin/dawah/books/:id/file (an authenticated inline stream) so
   an admin can read a book BEFORE publishing it. Reuse the preview overlay
   component from Prompt 10.

3. /[locale]/admin/dawah/categories — a simple table CRUD for the shared
   taxonomy: slug, tri-lingual names, lucide icon name, sort order, active
   toggle. Deleting a category must NOT delete its courses/books (the FK is
   ON DELETE SET NULL) — say so in a confirmation message, so nobody hesitates
   to tidy the taxonomy.

4. /[locale]/admin/content/dawah — the CMS editor for the landing page's hero
   and description. Copy src/app/[locale]/admin/content/blog/page.tsx
   wholesale: ProtectedRoute with CONTENT_VIEW, ToastProvider, load with
   getSiteContent<DawahContent>(ContentKeys.dawah) merged over DAWAH_DEFAULT,
   save with saveSiteContent(ContentKeys.dawah, next), EN/RW/AR tabs, and
   RichTextEditor per language — WITH the remount-by-key rule (its body is
   uncontrolled after mount; not remounting silently writes one language's
   content into another's field).

5. Verify: upload a real PDF and a cover, save the book as a draft, proof it
   with the admin viewer, publish it, and confirm it appears on the public
   /dawah/library page with a working preview. Then set allowDownload=false
   and confirm the public Download button DISAPPEARS and the download endpoint
   returns 403. Then edit the CMS hero copy in Arabic and confirm /ar/dawah
   shows it. Report each step with what you actually observed.
```

---

## Prompt 13 — 🧪 All Roles — i18n, SEO, Accessibility & QA Hardening

```
You are a senior engineer doing the hardening pass on the newly built Dawah
Learning feature in the RMC App (Next.js 14 + NestJS monorepo). All Dawah
pages are built: public landing (/[locale]/dawah), courses list + detail,
library + preview overlay, and the admin CRUD + CMS pages. Read
docs/dawah-learning-implementation-plan.md §9 (definition of done).

Task: close the gaps that a feature-build always leaves. Work through these in
order and REPORT what you actually found — a hardening pass that reports
"everything passed" is a hardening pass that wasn't run.

1. i18n COMPLETENESS.
   - Diff the `dawah` and `admin.dawah` namespaces across
     src/messages/en.json, rw.json, and ar.json. Every key present in en MUST
     exist in rw and ar. Write a small script to prove it rather than eyeballing
     it, and report the missing-key list.
   - grep the Dawah components for hardcoded English string literals in JSX.
     Every user-visible string must come from a message key. List every
     violation you find and fix it.
   - Any rw/ar value that is still a copy of the English placeholder: list it
     explicitly for the translation team. Do not quietly leave it.

2. RTL. Load every Dawah page at /ar. Check: the navbar and sidebar mirror;
   card grids read right-to-left; icons that imply direction (chevrons, arrows,
   "next page") are flipped; the preview overlay toolbar mirrors; the Arabic
   font (Noto Naskh) is applied and line-height is comfortable. The codebase
   does NOT use Tailwind logical properties (ms-/me-) — it relies on the html
   dir attribute plus flexbox — so hardcoded left-*/right-* / pl-/pr- classes
   are the likely breakages. Hunt for them specifically.

3. SEO. Confirm generateMetadata() on /dawah/courses/[slug] and
   /dawah/library/[slug] produces per-item titles, descriptions, and OG images
   (not the site defaults). Add JSON-LD structured data: schema.org/Course on
   course detail pages and schema.org/Book on book pages — this is a
   materially valuable win for a dawah catalogue, whose entire purpose is being
   found by people searching. Verify with a structured-data validator and paste
   the result.

4. ACCESSIBILITY. Specifically:
   - The lesson-outline accordion: real <button> triggers, aria-expanded,
     aria-controls, full keyboard operation.
   - The book preview overlay: focus trap, Esc closes, focus RESTORES to the
     card that opened it, role="dialog" + aria-modal + an accessible label.
   - Every cover <img> has a meaningful alt (the book/course title — not
     "cover").
   - Colour contrast on the gold-on-green accents (rmc-gold #D4A017 on
     rmc-green #1A7A4A is a plausible failure — MEASURE it, don't assume).
   - Run axe or Lighthouse a11y on all five public pages and report the scores.

5. THE SECURITY CHECK THAT MATTERS MOST. Verify, by actual request against a
   running file-server, that a raw fetch of a book PDF key with no auth is
   rejected:
     curl -i http://localhost:3002/api/v1/files/dawah-library/<a real key>
   → MUST be 401. If it returns the PDF, the protected prefix is not active and
   EVERY book in the library is publicly downloadable regardless of its
   visibility setting — silently, with nothing appearing broken.

   Then check the two REGRESSION cases, because the Dawah work touched the
   shared prefix list:
     curl -i http://localhost:3002/api/v1/files/hajj-proofs/<a real key>   → 401
     curl -i http://localhost:3002/api/v1/files/funeral-docs/<a real key>  → 401
   And grep every deployment config, docker-compose file, and GitHub Actions
   workflow for PROTECTED_KEY_PREFIXES. It should be UNSET everywhere — the
   prefixes now live in code (DEFAULT_PROTECTED_PREFIXES). If any environment
   sets it, confirm it enumerates ALL THREE prefixes, because that variable
   OVERRIDES the code defaults rather than appending to them; a partial value
   there is a silent breach of whichever prefix it omits.

   This is the single highest-consequence check in the feature. Paste the raw
   output of every curl above.

6. PERFORMANCE. Lighthouse on /dawah, /dawah/courses, /dawah/library — target
   ≥ 90. Confirm cover images are sized/lazy-loaded and that the courses and
   books lists are actually paginating (not fetching every row and slicing
   client-side).

7. EMPTY + ERROR STATES. With an empty database: every page renders a designed
   empty state, not a blank screen or a crash. With the backend STOPPED: the
   landing page still renders via the CMS fallback, and the list pages show a
   designed error state.

Report findings as a list of concrete defects with file:line references, fix
them, and state plainly which checks passed, which failed, and which you did
not run.
```

---

## Deferred — Phase 7 (do not build now)

Held back deliberately; the schema already accommodates them (plan §4.3, §12).

- **Media Resources (video / audio).** `dawah_course_lessons.content_type`, `media_key`, and `media_url` already exist and are null. Adding video/audio is a new `content_type` value plus a player component — no migration, no API break. Standalone media (a khutbah belonging to no course) needs a nullable `course_id` or a small `dawah_media` table; decide then.
- **Enrolment & progress.** `dawah_enrolments` and `dawah_lesson_progress` are pure table-adds that touch nothing above.
- **Certificates of completion.** The platform already generates PDF certificates with pdf-lib + QR (`src/lib/goodConductCertificate.ts`) — reusable, but presupposes enrolment.

**Before starting Phase 7, re-answer plan §11 question 2** (is enrolment actually coming?). If the answer changed, the data model decision changes with it.
